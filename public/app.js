const app = document.getElementById("app");
const SUPABASE_URL = "https://xbteuroldclsiaskqokb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_M96nf7rmin03-S-kKCwDCA_0dylrQbN"
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function renderLogin() {
  app.innerHTML = `
    <section class="promoter-screen">
  <div class="promoter-card">

        <div class="login-left">
         
          <div class="login-content">
            <h1>Conferência de Posts</h1>
            
          </div>
        </div>

        <div class="login-right">
          <h2>Entrar</h2>
          <p>Acesse sua área para enviar posts ou conferir envios.</p>

          <div class="field">
            <label>E-mail</label>
            <input id="email" type="email" placeholder="Digite seu e-mail" />
          </div>

          <div class="field">
            <label>Senha</label>
            <input id="password" type="password" placeholder="Digite sua senha" />
          </div>

<div class="login-actions">
  <button onclick="login()">
    Entrar
  </button>

  <button onclick="renderCadastro()">
    Criar conta de promoter
  </button>
</div>
        </div>

      </div>
    </section>
  `;
}

async function login() {

  const email = document
    .getElementById("email")
    .value
    .trim()
    .toLowerCase();

  const password = document
    .getElementById("password")
    .value
    .trim();

  const { data, error } = await supabaseClient
    .from("app_users")
    .select("*")
    .eq("email", email)
    .eq("password_hash", password)
    .maybeSingle();

  console.log(data);
  console.log(error);

  if (!data) {
showToast("E-mail ou senha inválidos", "error");    return;
  }

  localStorage.setItem("user", JSON.stringify(data));

  if (data.role === "admin") {
    renderAdminDashboard();
  } else {
    renderPromoterDashboard();
  }
}
function renderCadastro() {
  app.innerHTML = `
    <section class="login-screen">
      <div class="login-card">
        <h1>Criar conta</h1>

        <p>Cadastro para promoters enviarem posts.</p>

        <input id="cadastro-nome" type="text" placeholder="Nome completo" />
        <input id="cadastro-instagram" type="text" placeholder="@instagram" />
        <input id="cadastro-email" type="email" placeholder="E-mail" />
        <input id="cadastro-senha" type="password" placeholder="Senha" />
<div class="login-actions">
  <button type="button" onclick="cadastrarPromoter()">
    Cadastrar
  </button>

  <button type="button" class="ghost-btn" onclick="renderLogin()">
    Voltar para login
  </button>
</div>
    </section>
  `;
}

async function cadastrarPromoter() {
  const name = document.getElementById("cadastro-nome").value.trim();
  const email = document.getElementById("cadastro-email").value.trim().toLowerCase();
  const password = document.getElementById("cadastro-senha").value.trim();
const instagramUser = document
  .getElementById("cadastro-instagram")
  .value
  .trim()
  .toLowerCase()
  .replace("@", "");
  if (!name || !email || !password) {
    showToast("Preencha todos os campos.", "error");
    return;
  }

  const { error } = await supabaseClient.from("app_users").insert({
    name,
    email,
    password_hash: password,
    role: "promoter",
active: true,
instagram_user: instagramUser  });

  if (error) {
    console.error(error);
showToast("Erro ao cadastrar promoter.", "error");    return;
  }

showToast("Conta criada com sucesso!");  renderLogin();
}
async function renderPromoterDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const { data: meusPosts } = await supabaseClient
    .from("posts")
    .select("*")
    .eq("promoter_id", user.id);
    const totalPosts = meusPosts ? meusPosts.length : 0;

const { data: antigos, error: antigosError } = await supabaseClient
  .from("promoter_posts")
  .select("*");


  app.innerHTML = `
    <section class="promoter-screen">
      <div class="promoter-card">

        <button onclick="logout()" class="logout-btn">
          Sair
        </button>

        <h1>Área do Promoter</h1>

        <div class="ranking-box">
          <strong>Meus envios</strong>
          <span>${totalPosts} posts</span>
        </div>

        <p>Envie prints dos posts para aprovação.</p>

        <input
          type="text"
          id="post-link"
          placeholder="Link do post"
        />

        <select id="platform">
          <option value="Feed">Feed</option>
          <option value="Story">Story</option>
          <option value="Reels">Reels</option>
        </select>

<input type="file" id="image" accept="image/*" />
       <button class="send-btn" onclick="enviarPost()">
  Enviar para aprovação
</button>

      </div>
    </section>
  `;
}
 
function showToast(message, type = "success") {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  toast.innerText = message;
  toast.className = `show toast-${type}`;

  setTimeout(() => {
    toast.className = "";
  }, 3000);
}

async function enviarPost() {
 const submitButton = document.querySelector(".send-btn");

  if (!submitButton) {
    showToast("Botão de envio não encontrado.", "error");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.innerText = "Enviando...";

    const user = JSON.parse(localStorage.getItem("user"));

    const link = document.getElementById("post-link").value.trim();
    const platform = document.getElementById("platform").value;
    const image = document.getElementById("image").files[0];

    if (!link) {
      showToast("Cole o link do post.", "error");
      return;
    }

    if (!image) {
      showToast("Escolha uma imagem.", "error");
      return;
    }

    if (image.size > 5 * 1024 * 1024) {
      showToast("Imagem muito pesada. Envie uma menor que 5MB.", "error");
      return;
    }

    if (!image.type.startsWith("image/")) {
      showToast("Envie uma imagem JPG ou PNG.", "error");
      return;
    }

    const extension = image.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const { data: uploadData, error: uploadError } =
      await supabaseClient.storage
        .from("posts")
        .upload(fileName, image);

    if (uploadError) {
      console.error(uploadError);
      showToast(uploadError.message || "Erro ao enviar imagem.", "error");
      return;
    }

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/posts/${uploadData.path}`;

    const { error } = await supabaseClient.from("posts").insert({
      promoter_id: user.id,
      promoter_name: user.name,
      promoter_email: user.email,
      instagram_user: user.instagram_user,
      campaign: "Divulgação",
      platform,
      post_url: link,
      print_url: imageUrl,
      published_at: new Date().toISOString().slice(0, 10),
      caption: "",
      notes: "",
      status: "pending"
    });

    if (error) {
      console.error(error);
      showToast("Erro ao salvar post.", "error");
      return;
    }

    showToast("Post enviado para aprovação!", "success");
document.getElementById("post-link").value = "";
document.getElementById("platform").value = "Feed";
document.getElementById("image").value = "";
    setTimeout(() => {
      renderPromoterDashboard();
    }, 1200);

  } catch (error) {
    console.error(error);
    showToast(error.message || "Erro inesperado ao enviar.", "error");

  } finally {
    submitButton.disabled = false;
    submitButton.innerText = "Enviar para aprovação";
  }
}
async function renderAdminDashboard() {
  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });
const { data: antigos } = await supabaseClient
  .from("promoter_posts")
  .select("*");

  if (error) {
    console.error(error);
showToast("Erro ao enviar post.", "error");    return;
  }

  const ranking = {};
const aliases = {
  "julia vilalva mancano": "ju.vilalva",
  "ju.vilalva": "ju.vilalva",

  "lais santos canovas": "laiscanovass",
  "laiscanovass": "laiscanovass",

  "daniele rebeca santos gonçalves": "danielerebeca5",
  "danielerebeca5": "danielerebeca5",

  "rogéria loraine faria do nascimento": "lorraiineroh",
  "lorraiineroh": "lorraiineroh",

  "tatiane aparecida da silva": "tatimariiano",
  "tatimariiano": "tatimariiano",

"eduardo carraro": "edu_carraro0",
  "edu_carraro0": "edu_carraro0",
  "edu_carraroo": "edu_carraro0",
};

posts.forEach(post => {
let promoter = String(  post.instagram_user ||
  post.promoter_name ||
  post.promoter_email ||
  "Sem nome"
  )
    .toLowerCase()
    .replace("@", "")
    .trim();
promoter = aliases[promoter] || promoter;

  if (!ranking[promoter]) {
    ranking[promoter] = 0;
  }

  ranking[promoter]++;
});

(antigos || []).forEach(post => {
let promoter = String(    post.instagram_user ||
    post.promoter ||
    "Sem nome"
  )
    .toLowerCase()
    .replace("@", "")
    .trim();
promoter = aliases[promoter] || promoter;
  if (!ranking[promoter]) {
    ranking[promoter] = 0;
  }

  ranking[promoter] += post.quantidade || 1;
});
const rankingHtml = Object.entries(ranking)
  .sort((a, b) => b[1] - a[1])    .map(([promoter, total]) => `
      <div class="ranking-item">
        <strong>${promoter}</strong>
        <span>${total} posts</span>
      </div>
    `)
    .join("");

  const postsHtml = posts.map(post => `
    <tr>
      <td data-label="Promoter">
        ${post.promoter_name || post.promoter_email || "Sem nome"}
      </td>

      <td data-label="Tipo">${post.platform}</td>

      <td data-label="Print">
        ${
          post.print_url
            ? `<img 
  src="${post.print_url}" 
  class="admin-image"
  onclick="openImage('${post.print_url}')"
/>`
            : `<span>Sem print</span>`
        }
      </td>

      <td data-label="Status">${post.status}</td>

      <td data-label="Ações">
        <button onclick="aprovarPost('${post.id}')">
          Aprovar
        </button>

        <button onclick="reprovarPost('${post.id}')">
          Reprovar
        </button>
      </td>
    </tr>
  `).join("");

  app.innerHTML = `
    <section class="promoter-screen">
      <div class="promoter-card">

        <button onclick="logout()" class="logout-btn">
          Sair
        </button>

        <h1>Painel Admin</h1>

        <p>Gerencie os posts enviados.</p>

        <div class="ranking-box">
          <h2>Ranking de Promoters</h2>
          ${rankingHtml || "<p>Nenhum post enviado ainda.</p>"}
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Promoter</th>
              <th>Tipo</th>
              <th>Print</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            ${postsHtml}
          </tbody>
        </table>

      </div>
    </section>
  `;
 
}
function logout() {
  localStorage.removeItem("user");
  renderLogin();
}

async function aprovarPost(id) {
  const { error } = await supabaseClient
    .from("posts")
    .update({ status: "approved" })
    .eq("id", id);

  if (error) {
    console.error(error);
    showToast("Erro ao aprovar post.", "error");
    return;
  }

  showToast("Post aprovado!", "success");
  renderAdminDashboard();
}

async function reprovarPost(id) {
  const { error } = await supabaseClient
    .from("posts")
    .update({ status: "rejected" })
    .eq("id", id);

  if (error) {
    console.error(error);
    showToast("Erro ao reprovar post.", "error");
    return;
  }

  showToast("Post reprovado.", "success");
  renderAdminDashboard();
}

function openImage(url) {
  const modal = document.createElement("div");

  modal.className = "image-modal";

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal" onclick="this.parentElement.parentElement.remove()">
        ×
      </span>

      <img src="${url}" />
    </div>
  `;

  document.body.appendChild(modal);
}
const savedUser = localStorage.getItem("user");

if (savedUser) {
  const user = JSON.parse(savedUser);

  if (user.role === "admin") {
    renderAdminDashboard();
  } else {
    renderPromoterDashboard();
  }

} else {
  renderLogin();
}