import type { FastifyInstance } from 'fastify';

declare module 'fastify' { interface FastifyRequest { rawFormBody?: Buffer } }

export function registerSignedFormBody(app: FastifyInstance) {
  app.decorateRequest('rawFormBody');
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'buffer' }, (request, body, done) => {
    const raw = body as Buffer;
    const values: Record<string, string> = Object.create(null);
    for (const [key, value] of new URLSearchParams(raw.toString('utf8'))) {
      if (Object.hasOwn(values, key)) return done(Object.assign(new Error('duplicate_form_parameter'), { statusCode: 400 }));
      values[key] = value;
    }
    request.rawFormBody = raw;
    done(null, values);
  });
}
