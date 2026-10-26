import "dotenv/config";
import app from "./app.js";
import { iniciarRevisionAtrasos } from "./services/cajaChica.service.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`ASSET PRO - Peticiones de Pago: servidor en puerto ${PORT}`);
    // Caja chica: avisa al jefe de liquidaciones atrasadas (cada 30 min).
    iniciarRevisionAtrasos();
});
