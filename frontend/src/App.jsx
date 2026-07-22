import AppRouter from "./router/AppRouter";
import { AuthProvider } from "./context/AuthProvider";
import { PrototypeDataProvider } from "./context/PrototypeDataContext";

function App() {
  return (
    <AuthProvider>
      <PrototypeDataProvider>
        <AppRouter />
      </PrototypeDataProvider>
    </AuthProvider>
  );
}

export default App;
