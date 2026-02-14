import { render } from '@react-email/components';
import WaitlistWelcome from '../emails/waitlist-welcome';

async function main() {
  const html = await render(WaitlistWelcome({ position: 1, language: 'ko' }));
  console.log('HTML length:', html.length);
  console.log('Contains tricolor:', html.includes('#002395'));
  console.log('Contains AccueilAI:', html.includes('AccueilAI'));
  console.log('Contains position:', html.includes('#1'));
  console.log('Contains Korean:', html.includes('등록'));
}

main().catch(console.error);
