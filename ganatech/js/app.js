/* =========================================================
   Ganatech — lógica de la app (Vue 3, build global)
   ========================================================= */
const { createApp } = Vue;

/* ---------- Tema: sigue el modo claro/oscuro del dispositivo ---------- */
const mq = matchMedia('(prefers-color-scheme: dark)');
const aplicarTema = () => document.documentElement.setAttribute('data-bs-theme', mq.matches ? 'dark' : 'light');
aplicarTema(); mq.addEventListener('change', aplicarTema);

/* ---------- Configuración y datos de ejemplo ---------- */
const ROLES = {
  dueno: { l: 'Dueño', d: 'Control total: añadir, editar, eliminar animales y gestionar fotos.', can: ['add', 'del', 'nom', 'fotos', 'delfoto', 'peso', 'vac', 'est', 'reset'] },
  vet:   { l: 'Veterinario', d: 'Registra salud, vacunas, pesos y fotos. No puede añadir ni eliminar animales.', can: ['fotos', 'peso', 'vac', 'est'] },
  ext:   { l: 'Externo', d: 'Solo lectura: puede ver la información y fotos de los animales.', can: [] }
};
/* Demo sin servidor: con un backend real esto se valida en el servidor (ver credenciales.txt) */
const USERS = {
  kaleth: { p: 'ganatech2026', n: 'Kaleth Acevedo', r: 'dueno' },
  vet:    { p: 'vet2026', n: 'Dr. Veterinario', r: 'vet' },
  visita: { p: 'visita2026', n: 'Visitante', r: 'ext' }
};
const RAZAS = ['Holstein', 'Brahman', 'Cebú-Holstein', 'Cebú', 'Angus', 'Criollo', 'Otra'];
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const img = n => `img/ganado-${n}.jpg`;
const SEED = [
  { id: 'G021', nombre: 'Lucero', fotos: [img(1), img(2)], raza: 'Holstein', sexo: 'Hembra', edad: 3, peso: 450, estado: 'Saludable', vac: '2026-07-22', prox: '2027-01-22', pesos: [['2026-09-01', 450]] },
  { id: 'G022', nombre: 'Bravo', fotos: [], raza: 'Holstein', sexo: 'Macho', edad: 3, peso: 450, estado: 'Saludable', vac: '2026-07-22', prox: '2027-01-22', pesos: [['2026-09-01', 450]] },
  { id: 'G105', nombre: 'Trueno', fotos: [img(3), img(4)], raza: 'Brahman', sexo: 'Macho', edad: 4, peso: 510, estado: 'Chequeo pendiente', vac: '2026-06-03', prox: '2026-12-03', pesos: [['2026-08-28', 510]] },
  { id: 'G048', nombre: 'Canela', fotos: [img(2)], raza: 'Holstein', sexo: 'Hembra', edad: 5, peso: 398, estado: 'Vacuna próxima', vac: '2026-03-13', prox: '2026-10-05', pesos: [['2026-08-30', 398]] },
  { id: 'G012', nombre: 'Paloma', fotos: [img(4)], raza: 'Cebú-Holstein', sexo: 'Hembra', edad: 2, peso: 432, estado: 'Saludable', vac: '2026-07-10', prox: '2027-01-10', pesos: [['2026-08-29', 432]] }
];

/* ---------- Utilidades ---------- */
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch (e) { return false } };
const read = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch (e) { return null } };
const today = () => new Date().toISOString().slice(0, 10);
const plus6 = d => { const x = new Date(d); x.setMonth(x.getMonth() + 6); return x.toISOString().slice(0, 10) };
/* Reduce las fotos (900 px, JPEG) para que quepan en el almacenamiento del navegador */
function pic(f, max = 900) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = im.width * k; c.height = im.height * k;
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', .75));
      };
      im.onerror = () => res(''); im.src = r.result;
    };
    r.onerror = () => res(''); r.readAsDataURL(f);
  });
}
const pics = fl => Promise.all([...fl].map(f => pic(f))).then(r => r.filter(Boolean));

/* ---------- App ---------- */
const app = createApp({
  data() {
    return {
      ROLES, RAZAS, MESES, hoy: today(),
      me: null, lf: { u: '', p: '', show: false, err: '' },
      hato: [], view: 'inicio', q: '', fs: '',
      tabs: [
        { v: 'inicio', i: '🏠', l: 'Inicio', s: 'Inicio' }, { v: 'hato', i: '🐄', l: 'Mi Ganado', s: 'Ganado' },
        { v: 'cal', i: '📅', l: 'Calendario', s: 'Vacunas' }, { v: 'salud', i: '🩺', l: 'Salud', s: 'Salud' },
        { v: 'perfil', i: '👤', l: 'Perfil', s: 'Perfil' }
      ],
      modal: null, selId: null, nf: { files: [] }, ferr: '', busy: false, conf: {},
      nn: '', nv: '', np: '', lb: null, lbArm: false, sx: 0,
      toastMsg: '', toastOn: false, welOn: false
    };
  },
  computed: {
    iniciales() { return this.me ? this.me.n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '' },
    cur() { return this.hato.find(a => a.id === this.selId) },
    sanos() { return this.hato.filter(a => a.estado === 'Saludable').length },
    alertas() { return this.hato.filter(a => a.estado !== 'Saludable') },
    pctSano() { return this.hato.length ? Math.round(this.sanos / this.hato.length * 100) : 0 },
    promedio() { return this.hato.length ? Math.round(this.hato.reduce((t, a) => t + a.peso, 0) / this.hato.length) : 0 },
    stats() {
      return [{ n: this.hato.length, l: 'Animales en total', v: 'hato' }, { n: this.sanos, l: 'Saludables', v: 'hato' },
        { n: this.alertas.length, l: 'Requieren atención', v: 'salud' }, { n: this.promedio + ' kg', l: 'Peso promedio', v: 'hato' }];
    },
    recientes() { return this.hato.slice(-3).reverse() },
    filtrados() {
      const q = this.q.toLowerCase();
      return this.hato.filter(a => (a.id + a.raza + (a.nombre || '')).toLowerCase().includes(q) && (!this.fs || a.estado === this.fs));
    },
    calendario() { return this.hato.filter(a => a.prox).sort((a, b) => a.prox.localeCompare(b.prox)) },
    proxima() {
      const a = this.calendario[0];
      return a ? { a, d: Math.round((new Date(a.prox) - new Date(today())) / 864e5) } : null;
    },
    lbFotos() { const a = this.lb && this.hato.find(x => x.id === this.lb.id); return a ? a.fotos : [] }
  },
  watch: { modal(v) { document.body.classList.toggle('modal-open', !!v) } },
  methods: {
    /* --- Utilidades de vista --- */
    can(p) { return !!this.me && ROLES[this.me.r].can.includes(p) },
    pc: e => e === 'Saludable' ? 'p-ok' : e === 'Chequeo pendiente' ? 'p-warn' : 'p-bad',
    fd(d) { if (!d) return '—'; const [y, m, dd] = d.split('-'); return dd + '/' + m + '/' + y },
    rel(d) { return d < 0 ? 'Vencida hace ' + -d + ' d' : d === 0 ? 'Hoy' : 'En ' + d + ' d' },
    go(v) { this.view = v; window.scrollTo(0, 0) },
    toast(t) { this.toastMsg = t; this.toastOn = true; clearTimeout(this._t); this._t = setTimeout(() => this.toastOn = false, 2200) },
    buzz() { try { navigator.vibrate && navigator.vibrate(30) } catch (e) {} },
    save() { const ok = store('gt_hato', this.hato); if (!ok) this.toast('⚠️ Memoria llena: no se pudo guardar'); return ok },
    load() {
      this.hato = read('gt_hato') || JSON.parse(JSON.stringify(SEED));
      this.hato.forEach(a => { if (!a.fotos) a.fotos = a.foto ? [a.foto] : []; delete a.foto });
    },
    /* --- Sesión --- */
    login() {
      const k = this.lf.u.toLowerCase(), u = USERS[k];
      if (u && u.p === this.lf.p) { store('gt_sess', k); this.enter(k, true) }
      else this.lf.err = 'Usuario o contraseña incorrectos.';
    },
    enter(k, fresh) {
      this.me = { ...USERS[k], k }; this.lf = { u: '', p: '', show: false, err: '' };
      this.load(); this.view = 'inicio';
      if (fresh) { this.buzz(); this.$nextTick(() => { this.welOn = true; setTimeout(() => this.welOn = false, 2000) }) }
    },
    logout() { try { localStorage.removeItem('gt_sess') } catch (e) {} this.closeM(); this.me = null },
    /* --- Modales --- */
    closeM() { this.modal = null },
    ver(id) { this.selId = id; this.nn = this.cur.nombre || ''; this.nv = ''; this.np = ''; this.modal = 'detail' },
    ask(t, p, ok, yes, back) { this.conf = { t, p, ok, yes, back }; this.modal = 'confirm' },
    askOut() { this.ask('¿Estás seguro que quieres salir?', 'Tendrás que ingresar de nuevo con tu usuario y contraseña.', 'Sí, salir', this.logout) },
    askReset() {
      if (!this.can('reset')) return;
      this.ask('¿Restaurar datos?', 'Se borrará todo tu ganado y se restaurará el listado de ejemplo. No se puede deshacer.', 'Sí, restaurar',
        () => { localStorage.removeItem('gt_hato'); this.load(); this.closeM(); this.toast('Datos restaurados') });
    },
    askDel() {
      if (!this.can('del')) return;
      const a = this.cur, id = a.id;
      this.ask('¿Eliminar animal?', `Se eliminará <b>${a.nombre || id}</b> (ID #${id}) con todo su historial y fotos. No se puede deshacer.`, 'Sí, eliminar',
        () => { this.hato = this.hato.filter(x => x.id !== id); this.save(); this.closeM(); this.toast('Animal eliminado') }, id);
    },
    /* --- Añadir animal --- */
    nextId() { let m = 0; this.hato.forEach(a => { const n = parseInt(a.id.replace(/\D/g, '')); if (n > m) m = n }); return 'G' + String(m + 1).padStart(3, '0') },
    openForm() {
      if (!this.can('add')) return this.toast('No tienes permiso para añadir animales');
      this.nf = { files: [], nom: '', id: this.nextId(), raza: 'Holstein', sexo: 'Hembra', edad: 2, peso: '', est: 'Saludable', vac: today(), prox: '' };
      this.ferr = ''; this.modal = 'form';
    },
    async addAnimal() {
      const f = this.nf, id = String(f.id).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!id || this.hato.some(a => a.id === id)) { this.ferr = 'El ID está vacío o ya existe.'; return }
      this.busy = true;
      const fotos = await pics(f.files);
      this.hato.push({ id, nombre: f.nom, fotos, raza: f.raza, sexo: f.sexo, edad: +f.edad, peso: +f.peso, estado: f.est,
        vac: f.vac, prox: f.prox || (f.vac ? plus6(f.vac) : ''), pesos: [[today(), +f.peso]] });
      this.busy = false;
      if (!this.save()) { this.hato.pop(); return }
      this.closeM(); this.buzz(); this.toast('✅ Animal ' + id + ' añadido');
    },
    /* --- Ficha del animal --- */
    setNom() { if (!this.can('nom')) return; this.cur.nombre = this.nn.trim(); this.save(); this.toast('Nombre guardado') },
    addPeso() {
      const v = +this.np; if (!this.can('peso') || !v) return;
      this.cur.peso = v; this.cur.pesos.push([today(), v]); this.np = ''; this.save(); this.toast('Peso registrado');
    },
    addVac() {
      if (!this.can('vac') || !this.nv) return;
      Object.assign(this.cur, { vac: this.nv, prox: plus6(this.nv), estado: 'Saludable' });
      this.nv = ''; this.save(); this.toast('Vacuna registrada · próxima en 6 meses');
    },
    setEst(v) { if (!this.can('est')) return; this.cur.estado = v; this.save(); this.toast('Estado actualizado') },
    async addFotos(fl) {
      if (!this.can('fotos') || !fl.length) return;
      this.toast('Subiendo fotos…');
      const r = await pics(fl); if (!r.length) return;
      const a = this.cur, antes = a.fotos.slice();
      a.fotos = antes.concat(r);
      if (!this.save()) a.fotos = antes; else this.toast('📷 ' + r.length + ' foto(s) añadida(s)');
    },
    /* --- Visor de fotos --- */
    openLb(i) { this.lb = { id: this.selId, i }; this.lbArm = false },
    closeLb() { this.lb = null },
    lbGo(d) { const n = this.lbFotos.length; this.lb.i = (this.lb.i + d + n) % n; this.lbArm = false },
    swipe(e) { const d = e.changedTouches[0].clientX - this.sx; if (Math.abs(d) > 50 && this.lbFotos.length > 1) this.lbGo(d < 0 ? 1 : -1) },
    lbDel() {
      if (!this.lbArm) { this.lbArm = true; setTimeout(() => this.lbArm = false, 3000); return }
      const a = this.cur, i = this.lb.i;
      a.fotos.splice(i, 1); this.save(); this.toast('Foto eliminada'); this.lbArm = false;
      if (a.fotos.length) this.lb.i = Math.min(i, a.fotos.length - 1); else this.closeLb();
    }
  },
  mounted() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.lb ? this.closeLb() : this.closeM();
      if (this.lb && e.key === 'ArrowLeft') this.lbGo(-1);
      if (this.lb && e.key === 'ArrowRight') this.lbGo(1);
    });
    const k = read('gt_sess'); if (typeof k === 'string' && USERS[k]) this.enter(k, false);
  }
});

/* Componente reutilizable: foto del animal o emoji si no tiene */
app.component('avatar', {
  props: { a: Object, size: Number },
  template: `<div class="ic" :style="size && { width: size + 'px', height: size + 'px', fontSize: size * .46 + 'px' }">
    <img v-if="a.fotos[0]" :src="a.fotos[0]" alt=""><template v-else>{{ a.sexo === 'Macho' ? '🐂' : '🐄' }}</template></div>`
});
app.mount('#app');
