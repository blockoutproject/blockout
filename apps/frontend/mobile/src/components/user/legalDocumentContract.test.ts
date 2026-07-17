import {
  legalDocumentFormDefaults,
  legalDocumentFormSchema,
  toUpdateMobileLegalDocumentRequest,
} from './legalDocumentFormContract';
import { toLegalDocumentView } from '@/src/hooks/config/legalDocument/legalDocumentView';

describe('legal document generated-client and form boundary', () => {
  const document = {
    type: 'privacy' as const,
    title: 'Privacy',
    version: '2026-07-17',
    content: '# Privacy',
  };

  it('preserves the existing defaults and typed request shape', () => {
    const defaults = legalDocumentFormDefaults(document);

    expect(defaults).toEqual({
      title: 'Privacy',
      version: '2026-07-17',
      content: '# Privacy',
    });
    expect(toUpdateMobileLegalDocumentRequest(defaults)).toEqual(defaults);
  });

  it.each([
    ['title', 'Titre requis'],
    ['version', 'Version requise'],
    ['content', 'Contenu requis'],
  ] as const)('keeps the exact %s required message', (field, message) => {
    const result = legalDocumentFormSchema.safeParse({
      title: 'Privacy',
      version: '1',
      content: 'Body',
      [field]: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });

  it('does not introduce trimming that the previous form did not perform', () => {
    expect(
      legalDocumentFormSchema.safeParse({
        title: ' ',
        version: ' ',
        content: ' ',
      }).success,
    ).toBe(true);
  });

  it('projects nullable wire content into controlled native input values', () => {
    expect(
      toLegalDocumentView({
        type: 'terms',
        title: null,
        version: null,
        content: null,
      }),
    ).toEqual({ type: 'terms', title: '', version: '', content: '' });
  });

  it('rejects an unknown legal-document discriminator', () => {
    expect(() =>
      toLegalDocumentView({
        type: 'unknown',
        title: 'Title',
        version: '1',
        content: 'Body',
      }),
    ).toThrow();
  });
});
