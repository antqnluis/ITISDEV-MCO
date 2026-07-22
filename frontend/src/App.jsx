import AppRouter from "./router/AppRouter";
import { PrototypeDataProvider } from "./context/PrototypeDataContext";

function App() {
  return (
    <PrototypeDataProvider>
      <AppRouter />
    </PrototypeDataProvider>
  );
}

export default App;
