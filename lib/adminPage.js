// lib/adminPage.js — server-rendered /admin dashboard. Same spirit as
// destinationPage.js: no client JS, no view engine, just template strings
// — this is an internal glance-at-it tool, not something worth a build step.

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const BASE_STYLE = `
  body{margin:0;background:#FFFFFF;color:#0E2A3D;font-family:'Inter',Arial,sans-serif;line-height:1.5;}
  .wrap{max-width:900px;margin:0 auto;padding:40px 24px 60px;}
  h1{font-size:1.4rem;margin:0 0 28px;}
  .stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;}
  .stat{background:#F1F9FF;border:1px solid #D9EEFA;border-radius:12px;padding:18px 20px;}
  .stat .n{font-family:monospace;font-size:1.7rem;font-weight:600;}
  .stat .l{font-size:0.78rem;color:#4C6E85;text-transform:uppercase;letter-spacing:0.06em;margin-top:4px;}
  h2{font-size:1.05rem;margin:0 0 12px;}
  table{width:100%;border-collapse:collapse;margin-bottom:32px;font-size:0.86rem;}
  th, td{text-align:left;padding:8px 10px;border-bottom:1px solid #EFEFEF;vertical-align:top;}
  th{color:#4C6E85;font-weight:600;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;}
  .muted{color:#5A7488;font-size:0.82rem;}
  form.logout{margin-top:8px;}
  button{font-family:inherit;font-size:0.82rem;cursor:pointer;}
  .logout-btn{background:none;border:none;color:#4C6E85;text-decoration:underline;padding:0;}
  .login-box{max-width:320px;margin:80px auto;padding:28px;border:1px solid #D9EEFA;border-radius:14px;}
  .login-box input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #D9EEFA;border-radius:8px;margin-bottom:12px;font-size:0.9rem;}
  .login-box button{width:100%;background:#0E2A3D;color:#fff;border:none;padding:11px;border-radius:8px;font-weight:600;}
  .error{color:#C0392B;font-size:0.82rem;margin-bottom:12px;}
`;

function renderAdminLogin({ error }) {
  return '<!DOCTYPE html>\n<html lang="fr"><head><meta charset="UTF-8">' +
    '<title>Peacetrip — Admin</title><style>' + BASE_STYLE + '</style></head><body>' +
    '<div class="login-box">' +
      '<h1>Admin</h1>' +
      (error ? '<div class="error">' + escapeHtml(error) + '</div>' : '') +
      '<form method="POST" action="/admin/login">' +
        '<input type="password" name="password" placeholder="Mot de passe" autofocus required>' +
        '<button type="submit">Entrer</button>' +
      '</form>' +
    '</div></body></html>';
}

function renderAdminDashboard(stats) {
  const statTile = (n, label) => '<div class="stat"><div class="n">' + n + '</div><div class="l">' + escapeHtml(label) + '</div></div>';

  const topDestRows = stats.topDestinations.map(row =>
    '<tr><td>' + escapeHtml(row.destination) + '</td><td>' + row.n + '</td></tr>'
  ).join('') || '<tr><td colspan="2" class="muted">Aucune donnée pour le moment.</td></tr>';

  const recentRows = stats.recentHistory.map(row => {
    const date = new Date(row.createdAt).toLocaleString('fr-FR');
    const prompt = row.promptText.length > 90 ? row.promptText.slice(0, 90) + '…' : row.promptText;
    return '<tr><td class="muted">' + date + '</td><td>' + escapeHtml(row.destination || '—') + '</td><td>' + escapeHtml(prompt) + '</td></tr>';
  }).join('') || '<tr><td colspan="3" class="muted">Aucune recherche pour le moment.</td></tr>';

  return '<!DOCTYPE html>\n<html lang="fr"><head><meta charset="UTF-8">' +
    '<title>Peacetrip — Admin</title><style>' + BASE_STYLE + '</style></head><body>' +
    '<div class="wrap">' +
      '<h1>Peacetrip — Admin</h1>' +
      '<div class="stat-row">' +
        statTile(stats.totalGenerations, 'Générations') +
        statTile(stats.totalSignups, 'Inscriptions') +
        statTile(stats.totalTrips, 'Séjours sauvegardés') +
      '</div>' +
      '<h2>Top 10 destinations</h2>' +
      '<table><thead><tr><th>Destination</th><th>Recherches</th></tr></thead><tbody>' + topDestRows + '</tbody></table>' +
      '<h2>20 dernières recherches</h2>' +
      '<table><thead><tr><th>Date</th><th>Destination</th><th>Prompt</th></tr></thead><tbody>' + recentRows + '</tbody></table>' +
      '<form class="logout" method="POST" action="/admin/logout"><button type="submit" class="logout-btn">Se déconnecter</button></form>' +
    '</div></body></html>';
}

module.exports = { renderAdminLogin, renderAdminDashboard };
