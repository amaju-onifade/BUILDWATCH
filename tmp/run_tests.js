
import { execSync } from 'child_process';

try {
  const output = execSync('npx vitest run src/modules/notifications/lib/dispatch.test.ts', { encoding: 'utf8' });
  console.log(output);
} catch (error) {
  console.log('STDOUT:');
  console.log(error.stdout);
  console.log('STDERR:');
  console.log(error.stderr);
}
