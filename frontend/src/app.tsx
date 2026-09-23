import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ApolloProvider } from "@apollo/client/react";
import { client } from "./apollo/client";
import { Layout } from "./components/Layout";
import { CatalogPage } from "./features/catalog/CatalogPage";
import { MedicationDetailPage } from "./features/catalog/MedicationDetailPage";
import { CheckoutPage } from "./features/cart/CheckoutPage";
import { OrdersPage } from "./features/orders/OrdersPage";
import { OrderDetailPage } from "./features/orders/OrderDetailPage";

/**
 * ApolloProvider envuelve TODO el árbol: es el Apollo Context que da acceso a
 * la caché normalizada y a los hooks desde cualquier componente, sin pasar el
 * cliente por props.
 */
export function App() {
	return (
		<ApolloProvider client={client}>
			<BrowserRouter>
				<Layout>
					<Routes>
						<Route path="/" element={<CatalogPage />} />
						<Route path="/medicamento/:id" element={<MedicationDetailPage />} />
						<Route path="/checkout" element={<CheckoutPage />} />
						<Route path="/pedidos" element={<OrdersPage />} />
						<Route path="/pedido/:id" element={<OrderDetailPage />} />
					</Routes>
				</Layout>
			</BrowserRouter>
		</ApolloProvider>
	);
}
