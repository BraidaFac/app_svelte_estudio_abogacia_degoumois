import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
	await db.currency.upsert({
		where: { name: 'JUS' },
		update: {},
		create: { name: 'JUS', value: 5000, isDefault: true }
	});
	await db.currency.upsert({
		where: { name: 'USD' },
		update: {},
		create: { name: 'USD', value: 1500, isDefault: false }
	});
	await db.currency.upsert({
		where: { name: 'EUR' },
		update: {},
		create: { name: 'EUR', value: 1650, isDefault: false }
	});
	await db.currency.upsert({
		where: { name: 'ARS' },
		update: {},
		create: { name: 'ARS', value: 1, isDefault: false }
	});
	console.log('Currencies seeded: JUS (default), USD, EUR, ARS');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
