import { config } from './config';

// Avisa a Pamela por WhatsApp. Nunca hace fallar la reserva: si algo sale mal, solo lo registra.
export async function notifyOwner(text) {
  const provider = process.env.WHATSAPP_PROVIDER || (process.env.CALLMEBOT_APIKEY ? 'callmebot' : 'none');
  try {
    if (provider === 'callmebot') {
      const url = new URL('https://api.callmebot.com/whatsapp.php');
      url.searchParams.set('phone', config.whatsappNumber);
      url.searchParams.set('text', text);
      url.searchParams.set('apikey', process.env.CALLMEBOT_APIKEY);
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`CallMeBot respondió ${res.status}`);
      return true;
    }
    console.log('[whatsapp] sin proveedor configurado; mensaje:\n' + text);
  } catch (err) {
    console.error('[whatsapp] no se pudo enviar el aviso:', err);
  }
  return false;
}
