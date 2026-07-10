import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// CONFIGURACIÓN DE SUPABASE (desde variables de entorno)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://heirivzfsksbrfdesfwa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_gNLnzXOEvSoZqzJyA3LTOQ_P4kRbpJ_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🌐 Conectado exitosamente a la nube de Supabase');

// 1. NUEVA RUTA: Consultar qué horarios ya están ocupados para un barbero en una fecha específica
app.get('/api/horarios-ocupados', async (req, res) => {
    let { fecha, barbero } = req.query;
    console.log(`🔍 Consulta de horarios ocupados para el barbero ${barbero} en la fecha ${fecha}`);

    try {
        // PARCHE DEFENSIVO: Si la fecha viene con guiones (2026-06-16 o 16-06-2026), los pasamos a barras para Supabase
        if (fecha && fecha.includes('-')) {
            fecha = fecha.split('-').join('/');
        }

        const { data: turnosOcupados, error } = await supabase
            .from('turnos')
            .select('hora')
            .eq('fecha', fecha)
            .eq('barbero', barbero);

        if (error) throw error;

        const listaHoras = turnosOcupados.map(turno => turno.hora);
        
        return res.status(200).json({ success: true, horariosOcupados: listaHoras });
    } catch (error) {
        console.error('❌ Error al consultar horarios en Supabase:', error.message);
        return res.status(500).json({ success: false, error: 'No se pudieron consultar los horarios ocupados' });
    }
});

// 2. RUTA DE SIEMPRE: Crear nuevo turno
app.post('/api/nuevo-turno', async (req, res) => {
    const { cliente, barbero, servicio, fecha, hora, pago, precio, whatsapp_cliente, whatsapp_barbero } = req.body;
    console.log(`📡 Nuevo turno recibido de ${cliente} para el barbero ${barbero}`);

    try {
        // Validar duplicados en la nube de Supabase
        const { data: turnoDuplicado, error: errorBusqueda } = await supabase
            .from('turnos')
            .select('*')
            .eq('fecha', fecha)
            .eq('hora', hora)
            .eq('barbero', barbero)
            .maybeSingle();

        if (errorBusqueda) {
            console.error('❌ Error al buscar duplicados en Supabase:', errorBusqueda.message);
        }

        if (turnoDuplicado) {
            console.warn(`⚠️ Intento de duplicado bloqueado: El barbero ${barbero} ya tiene ocupado el horario de las ${hora} hs.`);
            return res.status(400).json({ success: false, error: `El horario de las ${hora} hs ya fue reservado para el barbero ${barbero}.` });
        }

        // Opcional: workflows de Kapso para WhatsApp automático
        // Descomentar y configurar cuando tengan las APIs
        /*
        const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
        const urlsKapso = {
            Victor: "https://api.kapso.ai/platform/v1/workflows/.../executions",
            Maxi: "https://api.kapso.ai/platform/v1/workflows/.../executions",
        };
        const urlKapso = urlsKapso[barbero];
        if (urlKapso && KAPSO_API_KEY) {
            try {
                await fetch(urlKapso, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': KAPSO_API_KEY },
                    body: JSON.stringify({
                        workflow_execution: {
                            phone_number: whatsapp_cliente,
                            variables: { nombre: cliente, fecha, hora, precio }
                        }
                    })
                });
            } catch (kapsoErr) {
                console.warn('Kapso no disponible, se procede igual.');
            }
        }
        */

        // GUARDADO REAL EN LA NUBE DE SUPABASE
        const { error: errorInsert } = await supabase
            .from('turnos')
            .insert([{ 
                cliente, 
                barbero, 
                servicio, 
                fecha, 
                hora, 
                pago, 
                precio, 
                whatsapp_cliente, 
                whatsapp_barbero 
            }]);

        if (errorInsert) {
            throw errorInsert;
        }

        console.log(`💾 Turno guardado exitosamente en la nube de Supabase para ${cliente}`);
        return res.status(200).json({ success: true, message: 'Turno procesado y guardado en la nube correctamente' });

    } catch (error) {
        console.error('❌ Error en el proceso del servidor:', error.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor al conectar con la nube' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo de forma segura en el puerto ${PORT}`);
});