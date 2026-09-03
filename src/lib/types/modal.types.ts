import type { FormattedCase } from './case.types';

export interface ModalContext {
	openNewCase: () => void;
	openToPay: (caso: FormattedCase) => void;
	openCurrencies: () => void;
	openDetails: (caso: FormattedCase) => void;
	openEdit: (caso: FormattedCase) => void;
	openDelete: (caso: FormattedCase) => void;
	openConverter: () => void;
}
