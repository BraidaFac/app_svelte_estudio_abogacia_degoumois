import { db } from '$lib/db';
import type {
	AgingBucket,
	DashboardData,
	ProximoVencimiento,
	TendenciaDia,
	TendenciaMes,
	TendenciaPago,
	TopCasoDeuda
} from '$lib/types/dashboard.types';
import { formatDateToDashDMY } from '$lib/utils/formatters';
import { addDays, addMonths, differenceInDays, format } from 'date-fns';

// Raw query row shapes — MySQL SUM/DECIMAL comes back as string
type TendenciaDiaRow = { dia: number; cobradoARS: string };
type TendenciaPagoRow = { clientName: string; description: string; currencyName: string; nativeAmount: string; cobradoARS: string };
type CobradoRow = { cobradoARS: string };
type PorCobrarRow = { porCobrarARS: string };
type VencidaRow = { due_date: Date; arsAmount: string };
type CarteraRow = { saldoARS: string; totalARS: string };
type ProximoRow = {
	due_date: Date;
	arsAmount: string;
	caseId: number;
	clientName: string;
	description: string;
};
type TopDeudaRow = {
	caseId: number;
	clientName: string;
	description: string;
	deudaVencidaARS: string;
};
type TendenciaRow = { yr: number; mo: number; cobradoARS: string };

export function partitionAging(
	rows: { due_date: Date; arsAmount: string }[],
	now: Date
): { aging: AgingBucket; total: number; oldest: Date | null } {
	const aging: AgingBucket = { d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
	let total = 0;
	let oldest: Date | null = null;

	for (const row of rows) {
		const days = differenceInDays(now, new Date(row.due_date));
		const amount = Number(row.arsAmount ?? 0);
		total += amount;
		if (!oldest) oldest = new Date(row.due_date); // rows ordered ASC → first = oldest
		if (days <= 30) aging.d0_30 += amount;
		else if (days <= 60) aging.d31_60 += amount;
		else if (days <= 90) aging.d61_90 += amount;
		else aging.d90plus += amount;
	}

	return { aging, total, oldest };
}

export async function getDashboardData(): Promise<DashboardData> {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const in7Days = addDays(now, 7);
	const twelveMonthsAgo = addMonths(now, -12);

	const [
		cobradoRows,
		porCobrarRows,
		vencidasRows,
		carteraRows,
		casosActivos,
		proximosRows,
		topDeudaRows,
		tendenciaRows
	] = await Promise.all([
		db.$queryRaw<CobradoRow[]>`
      SELECT SUM(p.amount * cu.value) AS cobradoARS
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE p.payment_date >= ${startOfMonth} AND p.payment_date < ${startOfNextMonth}
    `,
		db.$queryRaw<PorCobrarRow[]>`
      SELECT SUM((ca.amount / pc.cnt) * cu.value) AS porCobrarARS
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      JOIN (SELECT caseId, COUNT(*) AS cnt FROM Payment GROUP BY caseId) pc ON pc.caseId = ca.id
      WHERE p.payment_date IS NULL
        AND p.due_date >= ${startOfMonth} AND p.due_date < ${startOfNextMonth}
        AND ca.restAmount > 0 AND ca.closed = false
    `,
		db.$queryRaw<VencidaRow[]>`
      SELECT p.due_date, (ca.amount / pc.cnt) * cu.value AS arsAmount
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      JOIN (SELECT caseId, COUNT(*) AS cnt FROM Payment GROUP BY caseId) pc ON pc.caseId = ca.id
      WHERE p.payment_date IS NULL
        AND p.due_date < ${now}
        AND ca.restAmount > 0 AND ca.closed = false
      ORDER BY p.due_date ASC
    `,
		db.$queryRaw<CarteraRow[]>`
      SELECT
        SUM(ca.restAmount * cu.value) AS saldoARS,
        SUM(ca.amount * cu.value) AS totalARS
      FROM Cases ca
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE ca.restAmount > 0 AND ca.closed = false
    `,
		db.cases.count({ where: { restAmount: { gt: 0 }, closed: false } }),
		db.$queryRaw<ProximoRow[]>`
      SELECT p.due_date, (ca.amount / pc.cnt) * cu.value AS arsAmount,
             ca.id AS caseId, ca.clientName, ca.description
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      JOIN (SELECT caseId, COUNT(*) AS cnt FROM Payment GROUP BY caseId) pc ON pc.caseId = ca.id
      WHERE p.payment_date IS NULL
        AND p.due_date >= ${now} AND p.due_date < ${in7Days}
        AND ca.restAmount > 0 AND ca.closed = false
      ORDER BY p.due_date ASC
    `,
		db.$queryRaw<TopDeudaRow[]>`
      SELECT ca.id AS caseId, ca.clientName, ca.description,
             SUM((ca.amount / pc.cnt) * cu.value) AS deudaVencidaARS
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      JOIN (SELECT caseId, COUNT(*) AS cnt FROM Payment GROUP BY caseId) pc ON pc.caseId = ca.id
      WHERE p.payment_date IS NULL
        AND p.due_date < ${now}
        AND ca.restAmount > 0 AND ca.closed = false
      GROUP BY ca.id, ca.clientName, ca.description
      ORDER BY deudaVencidaARS DESC
      LIMIT 5
    `,
		db.$queryRaw<TendenciaRow[]>`
      SELECT YEAR(p.payment_date) AS yr, MONTH(p.payment_date) AS mo,
             SUM(p.amount * cu.value) AS cobradoARS
      FROM Payment p
      JOIN Cases ca ON p.caseId = ca.id
      JOIN Currency cu ON ca.currencyId = cu.id
      WHERE p.payment_date >= ${twelveMonthsAgo}
      GROUP BY yr, mo
      ORDER BY yr, mo
    `
	]);

	const { aging, total: totalVencidoARS, oldest } = partitionAging(vencidasRows, now);

	const saldoARS = Number(carteraRows[0]?.saldoARS ?? 0);
	const totalCarteraARS = Number(carteraRows[0]?.totalARS ?? 0);
	const porcentajeCobrado =
		totalCarteraARS > 0 ? ((totalCarteraARS - saldoARS) / totalCarteraARS) * 100 : 0;

	const tendenciaMensual: TendenciaMes[] = tendenciaRows.map((row) => ({
		mes: format(new Date(Number(row.yr), Number(row.mo) - 1, 1), 'MMM yy'),
		yr: Number(row.yr),
		mo: Number(row.mo),
		cobradoARS: Number(row.cobradoARS ?? 0)
	}));

	const proximosVencimientos: ProximoVencimiento[] = proximosRows.map((row) => ({
		caseId: Number(row.caseId),
		clientName: row.clientName,
		description: row.description,
		dueDate: formatDateToDashDMY(new Date(row.due_date).toISOString()) ?? '',
		arsAmount: Number(row.arsAmount ?? 0)
	}));

	const topCasosDeuda: TopCasoDeuda[] = topDeudaRows.map((row) => ({
		caseId: Number(row.caseId),
		clientName: row.clientName,
		description: row.description,
		deudaVencidaARS: Number(row.deudaVencidaARS ?? 0)
	}));

	return {
		cobradoEsteMesARS: Number(cobradoRows[0]?.cobradoARS ?? 0),
		porCobrarEsteMesARS: Number(porCobrarRows[0]?.porCobrarARS ?? 0),
		totalVencidoARS,
		casosActivos,
		aging,
		cuotaMasAntigua: oldest ? (formatDateToDashDMY(oldest.toISOString()) ?? null) : null,
		saldoPendienteTotalARS: saldoARS,
		porcentajeCobrado,
		valorTotalCarteraARS: totalCarteraARS,
		proximosVencimientos,
		topCasosDeuda,
		tendenciaMensual
	};
}

export async function getTendenciaDiaria(yr: number, mo: number): Promise<TendenciaDia[]> {
	const rows = await db.$queryRaw<TendenciaDiaRow[]>`
    SELECT DAY(p.payment_date) AS dia, SUM(p.amount * cu.value) AS cobradoARS
    FROM Payment p
    JOIN Cases ca ON p.caseId = ca.id
    JOIN Currency cu ON ca.currencyId = cu.id
    WHERE YEAR(p.payment_date) = ${yr} AND MONTH(p.payment_date) = ${mo}
    GROUP BY dia ORDER BY dia
  `;
	return rows.map((r) => ({ dia: Number(r.dia), cobradoARS: Number(r.cobradoARS ?? 0) }));
}

export async function getTendenciaPagos(yr: number, mo: number, day: number): Promise<TendenciaPago[]> {
	const rows = await db.$queryRaw<TendenciaPagoRow[]>`
    SELECT ca.clientName, ca.description, cu.name AS currencyName,
           p.amount AS nativeAmount, p.amount * cu.value AS cobradoARS
    FROM Payment p
    JOIN Cases ca ON p.caseId = ca.id
    JOIN Currency cu ON ca.currencyId = cu.id
    WHERE YEAR(p.payment_date) = ${yr} AND MONTH(p.payment_date) = ${mo} AND DAY(p.payment_date) = ${day}
    ORDER BY cobradoARS DESC
  `;
	return rows.map((r) => ({
		clientName: r.clientName,
		description: r.description,
		currencyName: r.currencyName,
		nativeAmount: Number(r.nativeAmount ?? 0),
		cobradoARS: Number(r.cobradoARS ?? 0)
	}));
}
