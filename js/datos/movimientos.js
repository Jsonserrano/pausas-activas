'use strict';
/*
 * Biblioteca de movimientos seguros para el generador SIN internet.
 * El generador local combina estos movimientos al azar para armar
 * ejercicios nuevos cuando no hay llave de IA o no hay conexión.
 */
window.PA = window.PA || {};

PA.ZONAS = {
  ojos: { es: 'Ojos', en: 'Eyes' },
  cuello: { es: 'Cuello', en: 'Neck' },
  hombros: { es: 'Hombros', en: 'Shoulders' },
  manos: { es: 'Manos y muñecas', en: 'Hands and wrists' },
  espalda: { es: 'Espalda y abdomen', en: 'Back and core' },
  piernas: { es: 'Cadera y piernas', en: 'Hips and legs' },
  respiracion: { es: 'Respiración y estrés', en: 'Breathing and stress' },
  completo: { es: 'Cuerpo completo', en: 'Full body' }
};

PA.MOVIMIENTOS = {
  ojos: [
    { es: 'Aparta la vista de la pantalla y mira un punto lejano (a más de 6 metros).', en: 'Look away from the screen at a point more than 6 meters away.' },
    { es: 'Parpadea despacio y de forma completa, como si limpiaras tus ojos.', en: 'Blink slowly and fully, as if cleaning your eyes.' },
    { es: 'Sin mover la cabeza, mira arriba, abajo, a la derecha y a la izquierda.', en: 'Without moving your head, look up, down, right and left.' },
    { es: 'Dibuja con la mirada un círculo grande, lento, en ambos sentidos.', en: 'Draw a big slow circle with your eyes, both directions.' },
    { es: 'Frota las palmas, ponlas tibias sobre los ojos cerrados y respira.', en: 'Rub your palms and rest them, warm, over your closed eyes while breathing.' },
    { es: 'Alterna el enfoque: mira la punta de tu dedo y luego un objeto lejano.', en: 'Switch focus: look at your fingertip, then at a distant object.' }
  ],
  cuello: [
    { es: 'Inclina la oreja derecha hacia el hombro, sin subirlo. Cambia de lado.', en: 'Tilt your right ear toward your shoulder without lifting it. Switch sides.' },
    { es: 'Lleva el mentón al pecho suavemente y vuelve al centro.', en: 'Gently bring your chin to your chest and return to center.' },
    { es: 'Gira la cabeza despacio a la derecha y a la izquierda, como diciendo "no".', en: 'Slowly turn your head right and left, as if saying "no".' },
    { es: 'Mete el mentón hacia atrás, como haciendo "papada", y suelta.', en: 'Tuck your chin back, making a "double chin", then release.' },
    { es: 'Haz medios círculos con la cabeza por delante, de hombro a hombro.', en: 'Make half circles with your head in front, from shoulder to shoulder.' }
  ],
  hombros: [
    { es: 'Sube los hombros hacia las orejas, sostén y déjalos caer relajados.', en: 'Lift your shoulders toward your ears, hold and let them drop.' },
    { es: 'Haz círculos con los hombros hacia atrás, amplios y lentos.', en: 'Roll your shoulders backward in big slow circles.' },
    { es: 'Entrelaza los dedos atrás de la espalda y abre el pecho.', en: 'Interlace your fingers behind your back and open your chest.' },
    { es: 'Lleva un brazo cruzado al frente y sujétalo con el otro. Cambia.', en: 'Bring one arm across your chest and hold it with the other. Switch.' },
    { es: 'Junta las escápulas atrás, como apretando un lápiz, y suelta.', en: 'Squeeze your shoulder blades together as if holding a pencil, then release.' },
    { es: 'Estira los brazos hacia arriba entrelazando los dedos y crece.', en: 'Reach your arms up with fingers interlaced and stretch tall.' }
  ],
  manos: [
    { es: 'Abre y cierra las manos con fuerza, estirando bien los dedos.', en: 'Open and close your hands firmly, spreading your fingers wide.' },
    { es: 'Haz círculos con las muñecas en ambos sentidos.', en: 'Circle your wrists in both directions.' },
    { es: 'Brazo al frente, palma arriba: con la otra mano lleva los dedos hacia abajo.', en: 'Arm forward, palm up: use the other hand to gently pull the fingers down.' },
    { es: 'Brazo al frente, palma abajo: lleva suavemente los dedos hacia ti.', en: 'Arm forward, palm down: gently pull the fingers toward you.' },
    { es: 'Toca con el pulgar la punta de cada dedo, ida y vuelta.', en: 'Touch your thumb to each fingertip, back and forth.' },
    { es: 'Sacude las manos sueltas para relajar antebrazos.', en: 'Shake your hands loosely to relax your forearms.' }
  ],
  espalda: [
    { es: 'Sentado, gira el tronco a la derecha apoyando la mano en el espaldar. Cambia.', en: 'Seated, twist your torso right holding the chair back. Switch.' },
    { es: 'De pie, manos en la cintura, inclina el tronco a un lado y al otro.', en: 'Standing, hands on hips, bend your torso to one side and then the other.' },
    { es: 'Sentado, redondea la espalda llevando el ombligo atrás y luego estírala.', en: 'Seated, round your back pulling your belly in, then straighten it.' },
    { es: 'De pie, manos en la zona lumbar, lleva el pecho un poco hacia arriba.', en: 'Standing, hands on your lower back, lift your chest slightly upward.' },
    { es: 'Contrae el abdomen suavemente sin dejar de respirar y suelta.', en: 'Gently tighten your core while breathing, then release.' }
  ],
  piernas: [
    { es: 'De pie, sube las rodillas alternadas como marchando en el sitio.', en: 'Standing, march in place lifting your knees alternately.' },
    { es: 'Apoyado en la silla, ponte en puntas de pie y baja despacio.', en: 'Holding the chair, rise onto your toes and lower slowly.' },
    { es: 'Sentado, estira una pierna al frente y lleva la punta del pie hacia ti.', en: 'Seated, extend one leg and point your toes toward you.' },
    { es: 'Haz círculos con los tobillos en ambos sentidos.', en: 'Circle your ankles in both directions.' },
    { es: 'De pie, lleva el talón hacia el glúteo sujetando el tobillo. Cambia.', en: 'Standing, bring your heel toward your glute holding the ankle. Switch.' },
    { es: 'Haz sentadillas cortas usando la silla como guía.', en: 'Do small squats using the chair as a guide.' }
  ],
  respiracion: [
    { es: 'Inhala por la nariz contando 4, retén 4, exhala por la boca contando 6.', en: 'Inhale through your nose for 4, hold 4, exhale through your mouth for 6.' },
    { es: 'Pon una mano en el abdomen y respira llevando el aire a la mano.', en: 'Place a hand on your belly and breathe into it.' },
    { es: 'Al inhalar sube los hombros; al exhalar déjalos caer con un suspiro.', en: 'Lift your shoulders as you inhale; drop them with a sigh as you exhale.' },
    { es: 'Cierra los ojos y relaja la frente, la mandíbula y los hombros.', en: 'Close your eyes and relax your forehead, jaw and shoulders.' },
    { es: 'Respira contando 4 al entrar y 4 al salir, en forma de "caja".', en: 'Breathe in for 4 and out for 4, in a steady "box" rhythm.' }
  ]
};
// "Cuerpo completo" toma movimientos de todas las zonas.
PA.MOVIMIENTOS.completo = [].concat(PA.MOVIMIENTOS.cuello, PA.MOVIMIENTOS.hombros, PA.MOVIMIENTOS.manos, PA.MOVIMIENTOS.espalda, PA.MOVIMIENTOS.piernas);

PA.PRECAUCIONES = {
  es: 'Muévete despacio y sin rebotes. Si sientes dolor o mareo, detente.',
  en: 'Move slowly, without bouncing. Stop if you feel pain or dizziness.'
};
