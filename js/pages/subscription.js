import { APP_CONFIG } from '../config.js';
import { activateSubscription, getUser, hasActiveSubscription } from '../auth.js';

export function renderSubscription(container) {
  const user = getUser();
  if (!user) {
    location.hash = '#/login';
    return;
  }
  if (hasActiveSubscription()) {
    location.hash = '#/app';
    return;
  }

  const price = APP_CONFIG.pricing.label;

  container.innerHTML = `
    <div class="auth-card" style="max-width:480px">
      <h1 class="page-title">Activa tu plan</h1>
      <p class="page-sub">Acceso completo a todas las pruebas PAES, ensayos y seguimiento de progreso.</p>
      <div class="pricing-box">
        <div class="pricing-amount">${price}</div>
        <ul class="pricing-features">
          <li>✓ Ruta de estudio con ensayos obligatorios</li>
          <li>✓ M1, M2, CL, HCS y Ciencias</li>
          <li>✓ Biblioteca PDF M2</li>
          <li>✓ Panel de progreso personal</li>
        </ul>
      </div>
      <p class="pay-note">Integración de pago real (Mercado Pago / Webpay) en preparación. Por ahora puedes activar tu plan de prueba con el botón inferior.</p>
      <button class="btn btn-primary btn-block" id="btn-activate">Activar plan (demo)</button>
      <p id="sub-error" class="auth-error"></p>
    </div>
  `;

  container.querySelector('#btn-activate').addEventListener('click', async () => {
    const err = container.querySelector('#sub-error');
    try {
      await activateSubscription(1);
      location.hash = '#/pruebas';
    } catch (ex) {
      err.textContent = ex.message;
    }
  });
}
