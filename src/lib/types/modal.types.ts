import type { FormattedCase } from './case.types';

export interface ModalContext {
	openNewCase: () => void;
	openToPay: (caso: FormattedCase) => void;
	openJus: () => void;
	openDetails: (caso: FormattedCase) => void;
}
