const { resolve, basename } = require("path");
const { app, Menu, Tray, dialog } = require("electron");
const { spawn } = require("child_process");
const fixPath = require("fix-path");
const fs = require("fs");

const Store = require("electron-store");
const Sentry = require("@sentry/electron");
const is = require("electron-is");
const AutoLaunch = require("auto-launch");
const initAutoUpdate = require("update-electron-app");

const ElectronSampleAppLauncher = new AutoLaunch({
  name: "pointvc",
});

if (is.windows()) {
  initAutoUpdate({
    repo: "krowli/pointvc",
  });
}

fixPath();

Sentry.init({
  dsn: "https://bccb8a0ccb3040e6a1f2effdeec8e6be@sentry.io/1546752",
});

const schema = {
  projects: {
    type: "string",
  },
};

let mainTray = {};

if (app.dock) {
  app.dock.hide();
}

const store = new Store({ schema });

/*
  Language on computer
*/
function getLocale() {
  return JSON.parse(fs.readFileSync(resolve(__dirname, "locale/en.json")));
}

function render(tray = mainTray) {
  const storedProjects = store.get("projects");
  const projects = storedProjects ? JSON.parse(storedProjects) : [];
  const locale = getLocale();

  const items = projects.map(({ name, path }) => ({
    label: name,
    submenu: [
      {
        label: locale.openinfolder,
        click: () => {
          spawn(`cd ${path} && ${is.windows() ? 'start .' : 'open .'}`, {
            shell: true,
          });
        },
      },
      {
        label: locale.open,
        click: () => {
          spawn("code", [path], { shell: true });
        },
      },
      {
        label: locale.openA,
        click: () => {
          spawn("atom", [path], { shell: true });
        },
      },
      {
        label: locale.pull,
        click: () => {
          spawn(`cd ${path} && git pull`, { shell: true });
        },
      },
      {
        label: locale.push,
        click: () => {
          spawn(`cd ${path} && git push`, { shell: true });
        },
      },
      {
        label: locale.remove,
        click: () => {
          store.set(
            "projects",
            JSON.stringify(projects.filter(item => item.path !== path))
          );
          render();
        },
      },
    ],
  }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: locale.add,
      click: () => {
        const result = dialog.showOpenDialog({ properties: ["openDirectory"] });

        if (!result) return;

        const [path] = result;
        const name = basename(path);

        store.set(
          "projects",
          JSON.stringify([
            ...projects,
            {
              path,
              name,
            },
          ])
        );

        render();
      },
    },
    {
      type: "separator",
    },
    ...items,
    {
      type: "separator",
    },
    {
      type: "normal",
      label: locale.close,
      role: "quit",
      enabled: true,
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("click", tray.popUpContextMenu);
}

app.on("ready", () => {
  mainTray = new Tray(resolve(__dirname, "assets", "iconTemplate.png"));

  render(mainTray);
  ElectronSampleAppLauncher.enable();

  ElectronSampleAppLauncher.isEnabled()
    .then(function(isEnabled) {
      if (isEnabled) {
        return;
      }
      ElectronSampleAppLauncher.enable();
    })
    .catch(function(err) {
      // handle error
    });
});
