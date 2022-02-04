const { NimProcess } = require("./lsp.js");
const { NimIssueProvider } = require("./check.js");

var nimProcess = null;
var issueAssistant = null;
var projectFile = null;

exports.activate = async function() {
	nimProcess = new NimProcess();
	projectFile = nova.workspace.config.get("novov.nim.projectFile") || await findProjectFile();

	nova.config.observe("novov.nim.nimcheck", (current, _) => {
		if (issueAssistant != null && !current) {
			issueAssistant.dispose();
		}
		else if (current) {
			issueAssistant = nova.assistants.registerIssueAssistant(
				"nim", 
				new NimIssueProvider(projectFile), 
				{ event: "onSave" }
			);
		}
	});
	
	nova.workspace.onDidAddTextEditor(editor => {
		if (editor.document.syntax == "nim") {
			editor.softTabs = true;
			//Nim doesn't allow tabs, so always use spaces
		}
		
		editor.onDidSave(editor => {
			if (nova.workspace.config.get("novov.nim.autoprettify")) {
				prettify(editor.document.path);
			}
		})
	});
}

exports.deactivate = function() {
	if (nimProcess) {
		nimProcess.languageClient.stop();
		nimProcess = null;
	}
}

nova.commands.register("novov.nim.prettify", editor => {
	prettify(editor.document.path);
});

nova.commands.register("novov.nim.reload", workspace => {
	nimProcess.restart();
});

function prettify(path) {
	let indent = nova.workspace.config.get("novov.nim.indent");
	let width = nova.workspace.config.get("novov.nim.maxwidth");
	let proc = new Process(
		"/usr/bin/env", 
		{
			args: ["nimpretty", path, `--indent:${indent}`, `--maxLineLen:${width}`], 
			cwd: nova.workspace.path
		}
	);
	proc.start();
}

function exec(args) {
	let proc = new Process(
		"/usr/bin/env", 
		{args: args, cwd: nova.workspace.path}
	);
	let out = [];
	proc.start();
	proc.onStdout(l => out.push(l.trim()));
	
	return new Promise(resolve => {
		proc.onDidExit(() => resolve(out));
	});
}

async function findProjectFile() {
	let files = await exec(["find", ".", "-iname", "*.nimble"]);
	
	for (let file of files) {
		let fp = file.substring(2);
		let info = (await exec(["nimble", "dump", fp])).join(" ");	
				
		let srcDir = info.match(/srcDir: "(.+?)"/)[1];
		let name = info.match(/name: "(.+?)"/)[1];
		
		let projectFile = `${nova.path.join(nova.path.dirname(fp), srcDir, name)}.nim`;
		let valid = nova.fs.access(`${nova.workspace.path}/${projectFile}`, nova.fs.F_OK);
		
		if (srcDir && name && valid) {
			return projectFile;
		}
	}
	
	files = await exec(["find", ".", "-iname", "*.cfg"]);
	
	for (let file of files) {
		let projectFile = file.substring(2).replace(".cfg",".nim");
		
		if (nova.fs.access(`${nova.workspace.path}/${projectFile}`, nova.fs.F_OK)) {
			return projectFile;
		}
	}
	
	return false;
}