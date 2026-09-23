/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type ErrorCode =
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'PRESCRIPTION_INVALID'
  | 'PRESCRIPTION_REQUIRED'
  | 'UNAUTHORIZED'
  | 'VALIDATION';

export type LoginInput = {
  email: string;
  password: string;
};

/** Criterios de búsqueda del catálogo. Todos opcionales y combinables (AND). */
export type MedicationFilter = {
  categoryId?: string | number | null | undefined;
  requiresPrescription?: boolean | null | undefined;
  /** Busca en nombre comercial, principio activo y categoría. Ignora tildes y mayúsculas. */
  search?: string | null | undefined;
};

export type OrderItemInput = {
  medicationId: string;
  quantity: number;
};

export type OrderStatus =
  | 'APPROVED'
  | 'CANCELLED'
  | 'DISPATCHED'
  | 'PENDING_APPROVAL';

export type PlaceOrderInput = {
  items: Array<OrderItemInput>;
  prescriptions?: Array<PrescriptionInput> | null | undefined;
};

/** Soporte de fórmula médica para un medicamento de venta bajo receta. */
export type PrescriptionInput = {
  doctorLicense: string;
  doctorName: string;
  documentUrl?: string | null | undefined;
  issuedAt: string;
  medicationId: string;
};

export type RegisterPatientInput = {
  email: string;
  fullName: string;
  password: string;
};

export type MedicationCardFragment = { id: string, name: string, presentation: string, price: number, stock: number, requiresPrescription: boolean, category: { id: string, name: string } };

export type OrderViewFragment = { id: string, status: OrderStatus, total: number, itemCount: number, pendingPrescriptions: boolean, placedAt: string, projectedAt: string, items: Array<{ medicationId: string, name: string, presentation: string, quantity: number, unitPrice: number, lineTotal: number }> };

export type SearchMedicationsQueryVariables = Exact<{
  filter?: MedicationFilter | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type SearchMedicationsQuery = { medications: { totalCount: number, hasMore: boolean, items: Array<{ id: string, name: string, presentation: string, price: number, stock: number, requiresPrescription: boolean, category: { id: string, name: string } }> } };

export type MedicationDetailQueryVariables = Exact<{
  id: string;
}>;


export type MedicationDetailQuery = { medication: { id: string, sku: string, name: string, activeIngredient: string, dosage: string, presentation: string, price: number, stock: number, requiresPrescription: boolean, description: string | null, category: { id: string, name: string }, laboratory: { id: string, name: string } } | null };

export type CategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type CategoriesQuery = { categories: Array<{ id: string, name: string }> };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { login: { token: string | null, patient: { id: string, email: string, fullName: string } | null, errors: Array<{ field: string | null, message: string, code: ErrorCode }> } };

export type RegisterPatientMutationVariables = Exact<{
  input: RegisterPatientInput;
}>;


export type RegisterPatientMutation = { registerPatient: { token: string | null, patient: { id: string, email: string, fullName: string } | null, errors: Array<{ field: string | null, message: string, code: ErrorCode }> } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, email: string, fullName: string } | null };

export type PlaceOrderMutationVariables = Exact<{
  input: PlaceOrderInput;
}>;


export type PlaceOrderMutation = { placeOrder: { orderId: string | null, status: OrderStatus | null, total: number | null, order: { id: string, status: OrderStatus, total: number, itemCount: number, pendingPrescriptions: boolean, placedAt: string, projectedAt: string, items: Array<{ medicationId: string, name: string, presentation: string, quantity: number, unitPrice: number, lineTotal: number }> } | null, errors: Array<{ field: string | null, message: string, code: ErrorCode }> } };

export type MyOrdersQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type MyOrdersQuery = { myOrders: { totalCount: number, hasMore: boolean, items: Array<{ id: string, status: OrderStatus, total: number, itemCount: number, pendingPrescriptions: boolean, placedAt: string, projectedAt: string, items: Array<{ medicationId: string, name: string, presentation: string, quantity: number, unitPrice: number, lineTotal: number }> }> } };

export type OrderQueryVariables = Exact<{
  id: string;
}>;


export type OrderQuery = { order: { id: string, status: OrderStatus, total: number, itemCount: number, pendingPrescriptions: boolean, placedAt: string, projectedAt: string, items: Array<{ medicationId: string, name: string, presentation: string, quantity: number, unitPrice: number, lineTotal: number }> } | null };

export type ValidatePrescriptionMutationVariables = Exact<{
  orderId: string;
}>;


export type ValidatePrescriptionMutation = { validatePrescription: { status: OrderStatus | null, order: { id: string, status: OrderStatus, total: number, itemCount: number, pendingPrescriptions: boolean, placedAt: string, projectedAt: string, items: Array<{ medicationId: string, name: string, presentation: string, quantity: number, unitPrice: number, lineTotal: number }> } | null, errors: Array<{ field: string | null, message: string, code: ErrorCode }> } };

export type DispatchOrderMutationVariables = Exact<{
  orderId: string;
}>;


export type DispatchOrderMutation = { dispatchOrder: { status: OrderStatus | null, order: { id: string, status: OrderStatus, total: number, itemCount: number, pendingPrescriptions: boolean, placedAt: string, projectedAt: string, items: Array<{ medicationId: string, name: string, presentation: string, quantity: number, unitPrice: number, lineTotal: number }> } | null, errors: Array<{ field: string | null, message: string, code: ErrorCode }> } };

export type CancelOrderMutationVariables = Exact<{
  orderId: string;
}>;


export type CancelOrderMutation = { cancelOrder: { status: OrderStatus | null, order: { id: string, status: OrderStatus, total: number, itemCount: number, pendingPrescriptions: boolean, placedAt: string, projectedAt: string, items: Array<{ medicationId: string, name: string, presentation: string, quantity: number, unitPrice: number, lineTotal: number }> } | null, errors: Array<{ field: string | null, message: string, code: ErrorCode }> } };

export type OrderStatusChangedSubscriptionVariables = Exact<{
  orderId: string;
}>;


export type OrderStatusChangedSubscription = { orderStatusChanged: { id: string, status: OrderStatus, total: number, itemCount: number, pendingPrescriptions: boolean, placedAt: string, projectedAt: string, items: Array<{ medicationId: string, name: string, presentation: string, quantity: number, unitPrice: number, lineTotal: number }> } };
