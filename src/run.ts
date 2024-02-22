import 'dotenv/config';
import { buildApp } from './app';

const port = parseInt(process.env['PORT'] || '8080');
const host = '0.0.0.0';

async function main() {
    const app = await buildApp();
    await app.listen({ port, host });
}

main().catch((err) => console.error(err));
