  
      const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });

  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("JSON invalido."));
      }
    });

    req.on("error", reject);
  });
}

function summarizePosts(posts) {
  return {
    total: posts.length,
    pending: posts.filter((post) => post.status === "pending").length,
    approved: posts.filter((post) => post.status === "approved").length,
    rejected: posts.filter((post) => post.status === "rejected").length,
  };
}

function withPromoter(post, users) {
  const promoter = users.find((user) => user.id === post.promoterId);

  return {
    ...post,
    promoter: promoter
      ? {
          id: promoter.id,
          name: promoter.name,
          email: promoter.email,
        }
      : null,
  };
}

async function handleApi(req, res, url) {
  try {
    if (req.method === "GET" && url.pathname === "/api/promoter/posts") {
      const user = await requireRole(req, res, "promoter");
      if (!user) return;

      const posts = await store.listPostsByPromoter(user.id);
      const users = await store.listUsers();

      const decorated = posts.map((post) =>
        withPromoter(post, users)
      );

      sendJson(res, 200, {
        posts: decorated,
        summary: summarizePosts(decorated),
      });

      return;
    }

    if (req.method === "POST" && url.pathname === "/api/promoter/posts") {
      const user = await requireRole(req, res, "promoter");
      if (!user) return;

      const body = await readJsonBody(req);

      const validation = validatePostPayload(body);

      if (validation.error) {
        sendJson(res, 400, {
          message: validation.error,
        });

        return;
      }

      const post = await store.createPost(
        createPost({
          promoterId: user.id,
          ...validation.value,
        }),
      );

      const users = await store.listUsers();

      const promoterPosts =
        await store.listPostsByPromoter(user.id);

      sendJson(res, 201, {
        post: withPromoter(post, users),
        summary: summarizePosts(promoterPosts),
      });

      return;
    }

    if (req.method === "GET" && url.pathname === "/api/admin/dashboard") {
      const user = await requireRole(req, res, "admin");
      if (!user) return;

      const users = await store.listUsers();

      const posts = (await store.listPosts()).map((post) =>
        withPromoter(post, users),
      );

      const promoters = users
        .filter((candidate) => candidate.role === "promoter")
        .map((promoter) => {
          const promoterPosts = posts.filter(
            (post) => post.promoterId === promoter.id,
          );

          return {
            id: promoter.id,
            name: promoter.name,
            email: promoter.email,
            active: promoter.active,
            createdAt: promoter.createdAt,
            summary: summarizePosts(promoterPosts),
          };
        })
        .sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR"),
        );

      sendJson(res, 200, {
        posts,
        promoters,
        summary: summarizePosts(posts),
      });

      return;
    }

    if (req.method === "POST" && url.pathname === "/api/admin/promoters") {
      const user = await requireRole(req, res, "admin");
      if (!user) return;

      const body = await readJsonBody(req);

      const name = String(body.name || "").trim();

      const email = String(body.email || "")
        .trim()
        .toLowerCase();

      const password = String(body.password || "");

      if (name.length < 2) {
        sendJson(res, 400, {
          message: "Informe o nome do promoter.",
        });

        return;
      }

      if (!email.includes("@") || email.length < 6) {
        sendJson(res, 400, {
          message: "Informe um e-mail valido.",
        });

        return;
      }

      if (password.length < 6) {
        sendJson(res, 400, {
          message:
            "A senha precisa ter pelo menos 6 caracteres.",
        });

        return;
      }

      if (await store.emailExists(email)) {
        sendJson(res, 409, {
          message:
            "Ja existe um usuario com este e-mail.",
        });

        return;
      }

      const promoter = await store.createUser(
        createUser({
          name,
          email,
          password,
          role: "promoter",
        }),
      );

      sendJson(res, 201, {
        promoter: publicUser(promoter),
      });

      return;
    }

    const postStatusMatch = url.pathname.match(
      /^\/api\/admin\/posts\/([^/]+)$/
    );

    if (req.method === "PATCH" && postStatusMatch) {
      const user = await requireRole(req, res, "admin");
      if (!user) return;

      const postId = decodeURIComponent(
        postStatusMatch[1],
      );

      const body = await readJsonBody(req);

      const status = String(body.status || "");

      const adminNote = String(
        body.adminNote || "",
      ).trim();

      if (
        !["pending", "approved", "rejected"].includes(
          status,
        )
      ) {
        sendJson(res, 400, {
          message: "Status invalido.",
        });

        return;
      }

      const patch =
        status === "pending"
          ? {
              status,
              adminNote,
              verifiedAt: null,
              verifiedBy: null,
            }
          : {
              status,
              adminNote,
              verifiedAt: new Date().toISOString(),
              verifiedBy: user.id,
            };

      const post = await store.updatePost(
        postId,
        patch,
      );

      if (!post) {
        sendJson(res, 404, {
          message: "Post nao encontrado.",
        });

        return;
      }

      const users = await store.listUsers();

      const posts = await store.listPosts();

      sendJson(res, 200, {
        post: withPromoter(post, users),
        summary: summarizePosts(posts),
      });

      return;
    }

    sendJson(res, 404, {
      message: "Rota nao encontrada.",
    });
  } catch (error) {
    sendJson(res, 500, {
      message: error.message || "Erro interno.",
    });
  }
}

function serveStatic(req, res, url) {
  let requestedPath = decodeURIComponent(
    url.pathname,
  );

  if (requestedPath === "/") {
    requestedPath = "/index.html";
  }

  const filePath = path.resolve(
    PUBLIC_DIR,
    `.${requestedPath}`,
  );

  if (
    filePath !== PUBLIC_DIR &&
    !filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)
  ) {
    res.writeHead(403);

    res.end("Acesso negado.");

    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      res.writeHead(404, {
        "Content-Type":
          "text/plain; charset=utf-8",
      });

      res.end("Arquivo nao encontrado.");

      return;
    }

    const contentType =
      mimeTypes[
        path.extname(filePath).toLowerCase()
      ] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
    });

    res.end(contents);
  });
}

async function handleRequest(req, res) {
  const url = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`,
  );

  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }

  serveStatic(req, res, url);
}

module.exports = {
  handleApi,
  handleRequest,
  serveStatic,
};
const http = require("http");

const server = http.createServer(handleRequest);

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});