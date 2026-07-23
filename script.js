document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById('appointment-date');
    if(dateInput) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        let mm = hoy.getMonth() + 1;
        let dd = hoy.getDate();

        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;

        dateInput.min = `${yyyy}-${mm}-${dd}`;

        dateInput.addEventListener('change', (e) => {
            const elDia = new Date(e.target.value + 'T00:00:00').getDay();
            if (elDia === 0) {
                alert("Los domingos el local permanece cerrado. Por favor, elegí otro día.");
                e.target.value = "";
                document.getElementById('time-slots-container').innerHTML = "";
            } else {
                generarHorariosDinamicos();
            }
        });
    }

    document.querySelectorAll('input[name="barber"]').forEach(radio => {
        radio.addEventListener('change', () => {
            generarHorariosDinamicos();
        });
    });

    const phoneInput = document.getElementById('client-phone');
    if (phoneInput) {
        phoneInput.placeholder = "Ej: 5493884418918 (Sin espacios ni signos)";
    }
});

function generarHorariosDinamicos() {
    const barberoInput = document.querySelector('input[name="barber"]:checked');
    const dateInput = document.getElementById('appointment-date');
    const container = document.getElementById('time-slots-container');
    
    if (!barberoInput || !dateInput.value) {
        container.innerHTML = "";
        return;
    }

    const fecha = dateInput.value; 
    const numeroDiaSemana = new Date(fecha + 'T00:00:00').getDay();

    let horasDisponibles = [];

    if (numeroDiaSemana >= 1 && numeroDiaSemana <= 5) {
        horasDisponibles = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
    } else if (numeroDiaSemana === 6) {
        horasDisponibles = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
    }

    const turnosGuardados = JSON.parse(localStorage.getItem('turnos') || '[]');
    const barbero = barberoInput.value;
    const ocupadas = turnosGuardados.filter(t => t.fecha === fecha && t.barbero === barbero).map(t => t.hora);
    const libres = horasDisponibles.filter(h => !ocupadas.includes(h));

    container.innerHTML = "";

    if (libres.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">No hay horarios disponibles para este día</div>';
        return;
    }

    libres.forEach(hora => {
        container.innerHTML += `
            <label class="time-option">
                <input type="radio" name="time" value="${hora}">
                <span>${hora} hs</span>
            </label>
        `;
    });
}

function nextStep(stepNumber) {
    if (stepNumber === 2) {
        if (!document.querySelector('input[name="barber"]:checked')) {
            alert("Por favor, selecciona un barbero primero."); return;
        }
    }
    if (stepNumber === 3) {
        if (!document.querySelector('input[name="service"]:checked')) {
            alert("Por favor, selecciona un servicio primero."); return;
        }
    }
    if (stepNumber === 4) {
        const dateSelected = document.getElementById('appointment-date').value;
        const timeSelected = document.querySelector('input[name="time"]:checked');
        if (!dateSelected || !timeSelected) {
            alert("Por favor, selecciona tanto la fecha como la hora."); return;
        }
    }

    const progreso = (stepNumber / 4) * 100;
    const progressEl = document.getElementById('progress');
    if (progressEl) progressEl.style.width = `${progreso}%`;

    document.querySelectorAll('.booking-section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    
    const proximoPaso = document.getElementById(`step-${stepNumber}`);
    if (proximoPaso) {
        proximoPaso.style.display = 'block';
        proximoPaso.classList.add('active');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(stepNumber) {
    if (stepNumber === 1) {
        document.getElementById('main-steps-header').style.display = 'none';
        document.querySelectorAll('.booking-section').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        const paso0 = document.getElementById('step-0');
        paso0.style.display = 'block';
        paso0.classList.add('active');
        return;
    }

    const progreso = ((stepNumber) / 4) * 100;
    const progressEl = document.getElementById('progress');
    if (progressEl) progressEl.style.width = `${progreso}%`;

    document.querySelectorAll('.booking-section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });

    const pasoAnterior = document.getElementById(`step-${stepNumber}`);
    if (pasoAnterior) {
        pasoAnterior.style.display = 'block';
        pasoAnterior.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function confirmarTurno() {
    const barbero = document.querySelector('input[name="barber"]:checked').value;
    const servicioInput = document.querySelector('input[name="service"]:checked');
    const servicio = servicioInput.value;
    const precio = servicioInput.getAttribute('data-price') || '';
    const fecha = document.getElementById('appointment-date').value;
    const hora = document.querySelector('input[name="time"]:checked').value;
    const pago = document.querySelector('input[name="payment"]:checked');
    const nombre = document.getElementById('client-name').value.trim();
    let telefonoCliente = document.getElementById('client-phone').value.trim();

    if (!pago || !nombre || !telefonoCliente) {
        alert("Por favor, completa todos los datos de contacto."); return;
    }

    telefonoCliente = telefonoCliente.replace(/\s+/g, '').replace(/-/g, '').replace(/\+/g, '');

    const formatoValido = /^549\d{9,10}$/.test(telefonoCliente);

    if (!formatoValido) {
        alert("Número de WhatsApp inválido.\n\nPor favor, ingresalo comenzando con 549.\n\nEjemplo válido: 5493884418918");
        document.getElementById('client-phone').focus();
        return;
    }

    const fechaFormateada = fecha.split('-').reverse().join('/');

    let numeroBarbero = "";
    const telefonosBarberos = {
        "Barbero 1": "5493884418917",
        "Barbero 2": "5493884418917",
        "Barbero 3": "5493884418917",
        "Barbero 4": "5493884418917"
    };
    numeroBarbero = telefonosBarberos[barbero] || "";

    const progressEl = document.getElementById('progress');
    if (progressEl) progressEl.style.width = "100%";

    const numeroDestino = numeroBarbero.replace(/\s+/g, '').replace(/-/g, '').replace(/\+/g, '');

    const mensaje = `Hola ${barbero}! Acabo de reservar un turno desde la pagina web. Acá te dejo mis datos:\n\n` +
                    `Cliente: ${nombre}\n` +
                    `Servicio: ${servicio}\n` +
                    `Fecha: ${fechaFormateada}\n` +
                    `Hora: ${hora} hs\n\n` +
                    `¡Nos vemos!`;

    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = numeroDestino ? `https://wa.me/${numeroDestino}?text=${mensajeCodificado}` : "#";

    document.querySelectorAll('.booking-section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    
    const paso5 = document.getElementById('step-5');
    if (paso5) {
        paso5.style.display = 'block';
        paso5.classList.add('active');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const turnos = JSON.parse(localStorage.getItem('turnos') || '[]');
    turnos.push({
        cliente: nombre,
        barbero: barbero,
        servicio: servicio,
        fecha: fecha,
        hora: hora,
        pago: pago.value,
        precio: precio,
        whatsapp_cliente: telefonoCliente,
        whatsapp_barbero: numeroDestino
    });
    localStorage.setItem('turnos', JSON.stringify(turnos));

    if (urlWhatsApp !== "#") {
        window.location.href = urlWhatsApp;
    }
}

function iniciarReserva() {
    document.getElementById('step-0').style.display = 'none';
    document.getElementById('step-0').classList.remove('active');
    
    document.getElementById('main-steps-header').style.display = 'block';
    
    const paso1 = document.getElementById('step-1');
    paso1.style.display = 'block';
    paso1.classList.add('active');
    
    document.getElementById('progress').style.width = '25%';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function verHorario() {
    document.getElementById('modal-horario').style.display = 'flex';
}

function cerrarHorario() {
    document.getElementById('modal-horario').style.display = 'none';
}
