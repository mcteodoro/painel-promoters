const app = document.getElementById("app");
const SUPABASE_URL = "https://xbteuroldclsiaskqokb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_M96nf7rmin03-S-kKCwDCA_0dylrQbN"
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const imageInput = document.getElementById("image");
const fileName = `${Date.now()}-${image.name}`;

const preview = document.getElementById("preview-image");


imageInput.addEventListener("change", (event) => {

  const file = event.target.files[0];

  if(file){

    const reader = new FileReader();

    reader.onload = function(e){

      preview.src = e.target.result;
      preview.style.display = "block";

    };

    reader.readAsDataURL(file);

  }

});
function renderLogin() {
  app.innerHTML = `
    <section class="login-screen">
      <div class="login-container">

        <div class="login-left">
          <div class="logo-box">P</div>

          <div class="login-content">
            <h1>Conferência de Posts</h1>

            <p>
              Promoters enviam posts, o admin confere tudo em uma fila única.
            </p>
          </div>
        </div>

        <div class="login-right">
          <h2>Entrar</h2>

          <p>
            Acesse sua área para enviar posts ou conferir envios.
          </p>

          <div class="field">
            <label>E-mail</label>

            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
            />
          </div>

          <div class="field">
            <label>Senha</label>

            <input
              id="password"
              type="password"
              placeholder="Digite sua senha"
            />
          </div>

          <button onclick="login()">
            Entrar
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

  const { data, error } = await supabaseClient
    .from("app_users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) {
    alert("Usuário não encontrado.");
    return;
  }

  localStorage.setItem("user", JSON.stringify(data));

  if (data.role === "admin") {
    renderAdminDashboard();
  } else {
    renderPromoterDashboard();
  }
}

function renderPromoterDashboard() {
  app.innerHTML = `
    <section class="promoter-screen">
      <div class="promoter-card">

        <h1>Área do Promoter</h1>

        <p>
          Envie prints dos posts para aprovação do administrador.
        </p>

        <form class="promoter-form">

         <input id="post-link" type="text" placeholder="Link do post" />

<select id="platform">
  <option>Feed</option>
  <option>story</option>
  <option>Rells</option>
</select>

<input id="image" type="file" />
          <button
            type="button"
            onclick="enviarPost()"
          >
            Enviar para aprovação
          </button>

        </form>

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

  const { data: posts } = await supabaseClient
    .from("posts")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  app.innerHTML = `
    <section class="promoter-screen">

      <div class="promoter-card">

        <h1>Painel Admin</h1>

        <p>
          Gerencie os posts enviados.
        </p>
<img id="preview-image" class="preview-image" />
        <table class="admin-table">

          <thead>
            <tr>
              <th>Tipo</th>
              <th>Link</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>

            ${posts.map(post => `
              <tr>

                <td data-label="Tipo">${post.platform}</td>

<td data-label="Print">
  ${post.print_url ? `
    <img src="${post.print_url}" class="admin-image" />
  ` : `
    <span>Sem print</span>
  `}
</td>

<td data-label="Status">${post.status}</td>
</td>
</tr>
            `).join("")}
<td data-label="Ações">
  <button onclick="aprovarPost('${post.id}')">
    Aprovar
  </button>

  <button onclick="reprovarPost('${post.id}')">
    Reprovar
  </button>
</td>

        </table>

      </div>

    </section>
  `;
}
renderLogin();
async function aprovarPost(id) {

  await supabaseClient
    .from("posts")
    .update({
      status: "approved"
    })
    .eq("id", id);

  renderAdminDashboard();
}

async function reprovarPost(id) {

  await supabaseClient
    .from("posts")
    .update({
      status: "rejected"
    })
    .eq("id", id);

  renderAdminDashboard();
}
