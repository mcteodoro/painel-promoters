const app = document.getElementById("app");
const SUPABASE_URL = "https://xbteuroldclsiaskqokb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_M96nf7rmin03-S-kKCwDCA_0dylrQbN"
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function renderLogin() {
  app.innerHTML = `
    <section class="login-screen">
      <div class="login-container">

        <div class="login-left">
         
          <div class="login-content">
            <h1>Conferência de Posts</h1>
            <p>Promoters enviam posts, o admin confere tudo em uma fila única.</p>
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

<button type="button" onclick="login()">
  Entrar
</button>
          <button type="button" class="ghost-btn" onclick="renderCadastro()">
            Criar conta de promoter
          </button>
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
    alert("E-mail ou senha inválidos.");
    return;
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
        <input id="cadastro-email" type="email" placeholder="E-mail" />
        <input id="cadastro-senha" type="password" placeholder="Senha" />

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

  if (!name || !email || !password) {
    alert("Preencha todos os campos.");
    return;
  }

  const { error } = await supabaseClient.from("app_users").insert({
    name,
    email,
    password_hash: password,
    role: "promoter",
    active: true
  });

  if (error) {
    console.error(error);
    alert("Erro ao cadastrar promoter.");
    return;
  }

  alert("Conta criada com sucesso! Agora faça login.");
  renderLogin();
}
function renderPromoterDashboard() {
  app.innerHTML = `
    <section class="promoter-screen">
      <div class="promoter-card">

        <button onclick="logout()" class="logout-btn">
          Sair
        </button>

        <h1>Área do Promoter</h1>

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

        <input type="file" id="image" />

        <button onclick="enviarPost()">
          Enviar para aprovação
        </button>

      </div>
    </section>
  `;
}

async function enviarPost() {
  const user = JSON.parse(localStorage.getItem("user"));

  const link = document.getElementById("post-link").value.trim();
  const platform = document.getElementById("platform").value;
  const image = document.getElementById("image").files[0];

  if (!link) {
    alert("Cole o link do post.");
    return;
  }

  if (!image) {
    alert("Escolha uma imagem.");
    return;
  }

  const fileName = `${Date.now()}-${image.name}`;

  const { data: uploadData, error: uploadError } =
    await supabaseClient.storage
      .from("posts")
      .upload(fileName, image);

  if (uploadError) {
    console.error(uploadError);
    alert("Erro ao enviar imagem.");
    return;
  }

  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/posts/${uploadData.path}`;

  const { error } = await supabaseClient.from("posts").insert({
    promoter_id: user.id,
    campaign: "Divulgação",
    platform: platform,
    post_url: link,
    print_url: imageUrl,
    published_at: new Date().toISOString().slice(0, 10),
    caption: "",
    notes: "",
    status: "pending"
  });

  if (error) {
    console.error(error);
    alert("Erro ao enviar post.");
    return;
  }

  alert("Post enviado para aprovação!");
}

async function renderAdminDashboard() {
  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    alert("Erro ao carregar posts.");
    return;
  }

  app.innerHTML = `
    <section class="promoter-screen">
      <div class="promoter-card">

        <button onclick="logout()" class="logout-btn">
          Sair
        </button>

        <h1>Painel Admin</h1>

        <p>Gerencie os posts enviados.</p>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Print</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            ${posts.map(post => `
              <tr>
                <td data-label="Tipo">${post.platform}</td>

                <td data-label="Print">
                  ${
                    post.print_url
                      ? `<img src="${post.print_url}" class="admin-image" />`
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
            `).join("")}
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
  await supabaseClient
    .from("posts")
    .update({ status: "approved" })
    .eq("id", id);

  renderAdminDashboard ();
  
 
}
 renderLogin();