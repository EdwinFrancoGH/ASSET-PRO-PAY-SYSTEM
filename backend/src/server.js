import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`ASSET PRO - Peticiones de Pago: servidor en puerto ${PORT}`);
});
