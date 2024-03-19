import type { Config } from '@netlify/functions';
import { deleteOldCases } from '../../src/lib/case.model';

export default async () => {
	await deleteOldCases();
};

export const config: Config = {
	schedule: '@hourly'
};
