# Welcome to TanStack.com!

This site is built with TanStack Router!

- [TanStack Router Docs](https://tanstack.com/router)

It's deployed automagically with Netlify!

- [Netlify](https://netlify.com/)

## Development

From your terminal:

```sh
pnpm install
pnpm dev
```

This starts your app in development mode, rebuilding assets on file changes.

## HTTPS Configuration

This project is configured to run over HTTPS using `@vitejs/plugin-basic-ssl`, which automatically generates and caches a self-signed SSL certificate.

### Running with HTTPS

When you run `pnpm dev`, the development server will start at:

```
https://localhost:4667
```

### Browser Security Warning

On first run, your browser will display a security warning because the certificate is self-signed. This is expected behavior. To proceed:

1. Click "Advanced" (or "Show Details")
2. Click "Proceed to localhost" (or "Accept the Risk and Continue")

### Trusting the Certificate (macOS)

To avoid the browser warning on subsequent visits, you can add the self-signed certificate to your system's trusted certificates:

```sh
security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain-db <path-to-cert>
```

The certificate will be automatically created in your project's cache folder on first run.

### BFF Proxy Configuration

The development server proxies the following routes to the BFF server at `http://localhost:3118`:

- `/bff`
- `/signin-oidc`
- `/signout-callback-oidc`
- `/api`

If your BFF server also runs on HTTPS, update the proxy targets in `vite.config.ts` from `http://` to `https://`.

## Editing and previewing the docs of TanStack projects locally

The documentations for all TanStack projects except for `React Charts` are hosted on [https://tanstack.com](https://tanstack.com), powered by this TanStack Router app.
In production, the markdown doc pages are fetched from the GitHub repos of the projects, but in development they are read from the local file system.

Follow these steps if you want to edit the doc pages of a project (in these steps we'll assume it's [`TanStack/form`](https://github.com/tanstack/form)) and preview them locally :

1. Create a new directory called `tanstack`.

```sh
mkdir tanstack
```

2. Enter the directory and clone this repo and the repo of the project there.

```sh
cd tanstack
git clone git@github.com:TanStack/tanstack.com.git
git clone git@github.com:TanStack/form.git
```

> [!NOTE]
> Your `tanstack` directory should look like this:
>
> ```
> tanstack/
>    |
>    +-- form/
>    |
>    +-- tanstack.com/
> ```

> [!WARNING]
> Make sure the name of the directory in your local file system matches the name of the project's repo. For example, `tanstack/form` must be cloned into `form` (this is the default) instead of `some-other-name`, because that way, the doc pages won't be found.

3. Enter the `tanstack/tanstack.com` directory, install the dependencies and run the app in dev mode:

```sh
cd tanstack.com
pnpm i
# The app will run on https://localhost:3000 by default
pnpm dev
```

4. Now you can visit http://localhost:3000/form/latest/docs/overview in the browser and see the changes you make in `tanstack/form/docs`.

> [!NOTE]
> The updated pages need to be manually reloaded in the browser.

> [!WARNING]
> You will need to update the `docs/config.json` file (in the project's repo) if you add a new doc page!
