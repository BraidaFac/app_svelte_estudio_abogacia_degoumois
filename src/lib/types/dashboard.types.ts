export type AgingBucket = {
	d0_30: number;   // ARS
	d31_60: number;  // ARS
	d61_90: number;  // ARS
	d90plus: number; // ARS
};

export type ProximoVencimiento = {
	caseId: number;
	clientName: string;
	description: string;
	dueDate: string;    // "dd-mm-yyyy"
	arsAmount: number;
};

export type TopCasoDeuda = {
	caseId: number;
	clientName: string;
	description: string;
	deudaVencidaARS: number;
};

export type TendenciaMes = {
	mes: string;        // "Sep 25"
	yr: number;
	mo: number;
	cobradoARS: number;
};

export type TendenciaDia = {
	dia: number;
	cobradoARS: number;
};

export type TendenciaPago = {
	clientName: string;
	description: string;
	currencyName: string;
	nativeAmount: number;
	cobradoARS: number;
};

export type DashboardData = {
	// Hero KPIs (ARS)
	cobradoEsteMesARS: number;
	porCobrarEsteMesARS: number;
	totalVencidoARS: number;
	casosActivos: number;

	// Aging — active cases only (ARS)
	aging: AgingBucket;
	cuotaMasAntigua: string | null; // "dd-mm-yyyy"

	// Portfolio — active cases only (ARS)
	saldoPendienteTotalARS: number;
	porcentajeCobrado: number; // 0–100
	valorTotalCarteraARS: number;

	// Action lists
	proximosVencimientos: ProximoVencimiento[];
	topCasosDeuda: TopCasoDeuda[];

	// Trend chart
	tendenciaMensual: TendenciaMes[];
};
