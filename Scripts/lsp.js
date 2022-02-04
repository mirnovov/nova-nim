exports.NimProcess = class NimProcess {
	languageClient = null;
	
	constructor() {		
		let lsp = nova.path.expanduser(nova.config.get("novov.nim.lsppath") || "~/.nimble/bin/nimlsp");
		let extant = nova.fs.access(lsp, nova.fs.F_OK);
		
		if (!extant) {
			this.warnPath();
			return;
		}
		
		let client = new LanguageClient(
			"novov.nim", 
			"NimLSP", 
			{path: lsp}, 
			{initializationOptions: { checkOnSave: false }, syntaxes: ["nim"]}
		);
		
		client.onDidStop(() => console.log("NimLSP stopped (may be restarting):", !client.running));
		
		try {
			client.start();			
			this.languageClient = client;
			console.log("NimLSP running:", client.running);
		}
		catch (err) {
			console.error(err);
		}
	}
	
	restart() {
		if (this.languageClient) {
			this.languageClient.stop();
			this.languageClient.start();
		}
	}
	
	warnPath() {
		let request = new NotificationRequest("nim-cannot-find");
				
		request.title = "Cannot find LSP binary";
		request.body = "The Nim extension requires NimLSP. Ensure it is installed and its path is set correctly in the extension preferences.";
		request.actions = ["Installation Info...", "Close"];
		
		let promise = nova.notifications.add(request);
		promise.then(
			reply => {
				if (reply.actionIdx == 0) {
					nova.extension.openReadme();
				}
			}, 
			error => { console.error(error) }
		);
	}
}