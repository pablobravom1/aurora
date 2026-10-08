// Conexión de STC App con su proyecto de Supabase.
// Estas dos claves son seguras de tener aquí (son "públicas" a propósito,
// la protección real de los datos la hacen las políticas RLS en la base de datos).
const SUPABASE_URL = "https://jmssppcahnxqgdaoredl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-uO4xMqXu5JWohvCaXxM3w_tDBylmDf";

// Notificaciones push: sin clave pública VAPID la app no ofrece activarlas (se configuran al final).
const VAPID_PUBLIC_KEY = "";
