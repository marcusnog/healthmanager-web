export const Permissions = {
  FinanceCategoriesView: "finance.categories.view",
  FinanceCategoriesManage: "finance.categories.manage",
  FinanceReceivablesView: "finance.receivables.view",
  FinanceReceivablesManage: "finance.receivables.manage",
  FinancePayablesView: "finance.payables.view",
  FinancePayablesManage: "finance.payables.manage",
  FinanceSummaryView: "finance.summary.view",
  FinanceSettlements: "finance.settlements",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];