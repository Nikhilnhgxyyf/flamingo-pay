export type ActiveBill = {
  amount: number;
  targetPhone: string | null;
};

export const activeBills: Record<string, ActiveBill> = {};