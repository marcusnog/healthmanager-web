import { chromium } from '@playwright/test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const prototypeDirectory = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    await page.goto(pathToFileURL(path.join(prototypeDirectory, 'area-clinica.html')).href);
    await page.screenshot({ path: path.join(prototypeDirectory, 'agenda-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Marina Almeida', exact: false }).click();
    await page.getByRole('button', { name: 'Abrir prontuário', exact: true }).click();
    await page.getByLabel('Queixa principal', { exact: true }).fill('Registro de teste da paciente Marina');
    await page.getByRole('button', { name: 'Salvar rascunho' }).click();
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('#feedback').textContent = ''; });
    await page.screenshot({ path: path.join(prototypeDirectory, 'prontuario-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Pacientes', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir prontuário', exact: true }).nth(1).click();
    assert.equal(await page.getByLabel('Queixa principal', { exact: true }).inputValue(), '');
    await page.getByRole('button', { name: 'Pacientes', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir prontuário', exact: true }).first().click();
    assert.equal(await page.getByLabel('Queixa principal', { exact: true }).inputValue(), 'Registro de teste da paciente Marina');
    await page.getByRole('button', { name: 'Finalizar prontuário', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar finalização' }).click();
    assert.equal(await page.getByLabel('Queixa principal', { exact: true }).getAttribute('readonly'), '');
    await page.getByRole('button', { name: 'Adicionar adendo', exact: true }).click();
    await page.getByLabel('Correção ou complemento').fill('Complemento de teste');
    await page.getByRole('button', { name: 'Registrar adendo' }).click();
    assert.equal(await page.getByText('Complemento de teste', { exact: true }).count(), 1);
    for (const moduleName of ['Receituário', 'Exames', 'Imagens', 'Percentis', 'Anamnese', 'Questionários', 'Alimentos', 'Telemedicina', 'Evolução assistida', 'Assistente clínico', 'Todos os módulos']) {
      await page.getByRole('button', { name: moduleName, exact: true }).click();
      assert.equal(await page.locator('dialog').evaluate(dialog => dialog.open), true);
      await page.getByRole('button', { name: 'Fechar janela' }).click();
    }
    await page.getByRole('button', { name: 'Modelos de documentos', exact: true }).click();
    await page.getByRole('button', { name: 'Prévia', exact: true }).first().click();
    assert.equal(await page.getByRole('button', { name: 'Imprimir para assinatura manual' }).count(), 1);
    await page.evaluate(() => { window.print = () => { window.printedDocument = document.querySelector('.document-print').textContent; }; });
    await page.getByRole('button', { name: 'Imprimir para assinatura manual' }).click();
    assert.match(await page.evaluate(() => window.printedDocument), /Assinatura e carimbo/);
    await page.getByLabel('Forma de assinatura').selectOption('digital');
    await page.getByRole('button', { name: 'Simular envio para assinatura' }).click();
    assert.match(await page.locator('#signature-status').textContent(), /Nenhuma assinatura digital foi realizada/);
    await page.getByRole('button', { name: 'Fechar janela' }).click();
    await page.getByRole('button', { name: 'Novo modelo', exact: true }).click();
    await page.getByLabel('Título', { exact: true }).fill('Modelo criado no teste');
    await page.getByLabel('Disponível para').selectOption('Médico');
    await page.getByLabel('Conteúdo', { exact: true }).fill('Documento para {{paciente}}');
    await page.getByRole('button', { name: 'Salvar modelo', exact: true }).click();
    assert.equal(await page.getByText('Modelo criado no teste', { exact: true }).count(), 1);
    await page.evaluate(() => { document.querySelector('#feedback').textContent = ''; });
    await page.screenshot({ path: path.join(prototypeDirectory, 'modelos-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Configurações clínicas', exact: true }).click();
    for (const moduleName of ['Planilha de exames', 'Cadastro de alimentos', 'Formulários de anamnese', 'Questionários de apoio']) {
      await page.getByRole('button', { name: new RegExp(moduleName) }).click();
      await page.getByRole('button', { name: 'Fechar janela' }).click();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Agenda', exact: true }).click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert(await page.locator('#calendar').evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight));
    await page.screenshot({ path: path.join(prototypeDirectory, 'agenda-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('OK: navegação, módulos, rascunho por paciente, finalização, adendo, modelos e agenda mobile.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
