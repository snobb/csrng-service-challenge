import 'dotenv/config';
import { build } from './build';

const port = parseInt(process.env['PORT'] || '8080');
const host = '0.0.0.0';
const app = build();

async function main() {
    await app.listen({ port, host });
}

main().catch((err) => app.log.error(err));
