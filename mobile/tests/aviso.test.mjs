import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisar, avisosStore, descartar, registrarHost, responder } from '../lib/aviso.ts';

const cola = () => avisosStore.getState().cola;
const vaciar = () => avisosStore.setState({ cola: [] });

test('avisar sin botones pone uno de "Entendido" y tono info', () => {
  vaciar();
  avisar('Hola', 'Mensaje');
  assert.equal(cola().length, 1);
  assert.deepEqual(cola()[0].botones.map((b) => b.text), ['Entendido']);
  assert.equal(cola()[0].tono, 'info');
});

test('un botón destructivo vuelve el aviso de tono peligro, salvo tono explícito', () => {
  vaciar();
  avisar('Anular', '¿Seguro?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Anular', style: 'destructive' }]);
  avisar('Salir', '¿Seguro?', [{ text: 'Salir', style: 'destructive' }], 'aviso');
  assert.equal(cola()[0].tono, 'peligro');
  assert.equal(cola()[1].tono, 'aviso');
});

test('responder quita el aviso y ejecuta el botón; un aviso nuevo desde onPress queda en cola', () => {
  vaciar();
  let pulsado = false;
  avisar('Uno', undefined, [{ text: 'OK', onPress: () => { pulsado = true; avisar('Dos'); } }]);
  const [primero] = cola();
  responder(primero.id, primero.botones[0]);
  assert.equal(pulsado, true);
  assert.deepEqual(cola().map((a) => a.titulo), ['Dos']);
});

test('descartar usa el botón cancel; con un solo botón, ese botón; con varios sin cancel, nada', () => {
  vaciar();
  const pulsados = [];
  avisar('A', undefined, [{ text: 'Cancelar', style: 'cancel', onPress: () => pulsados.push('cancel') }, { text: 'Sí' }]);
  descartar(cola()[0]);
  avisar('B', undefined, [{ text: 'OK', onPress: () => pulsados.push('ok') }]);
  descartar(cola()[0]);
  avisar('C', undefined, [{ text: 'Uno' }, { text: 'Dos' }]);
  descartar(cola()[0]);
  assert.deepEqual(pulsados, ['cancel', 'ok']);
  assert.deepEqual(cola().map((a) => a.titulo), ['C']);
});

test('registrarHost apila hosts y los quita al desmontar', () => {
  const [raiz, quitarRaiz] = registrarHost();
  const [modal, quitarModal] = registrarHost();
  const ultimo = () => avisosStore.getState().hosts.at(-1);
  assert.equal(ultimo(), modal);
  quitarModal();
  assert.equal(ultimo(), raiz);
  quitarRaiz();
  assert.equal(avisosStore.getState().hosts.length, 0);
});
