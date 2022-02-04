exports.NimIssueProvider = class NimIssueProvider {
	projectFile = null;
	issues = [];

	constructor(projectFile) {
		this.projectFile = projectFile;
	}
	
	provideIssues(editor) {
		return new Promise(resolve => {
			let lines = [];
			let proc = new Process("/usr/bin/env", {
				args: ["nim", "check", "--stdout:on", "--colors:off", this.projectFile],
				cwd: nova.workspace.path
			});
			
			proc.onStdout(l => lines.push(l));
			proc.onStderr(l => lines.push(l));
			proc.start();
			
			proc.onDidExit(
				() => resolve(this.parseIssues(lines, editor))
			);
		});
	}
	
	parseIssues(lines, editor) {
		let issues = [];

		for (let line of lines) {
			let match = line.match(/^(.*)\((\d+), (\d+)\) (\w+)\: ([^\[]+)(?:\[(\w+)\])?/);
			if(!match || !editor.document.path.includes(match[1])) { continue; }
			
			let issue = new Issue();
			issue.line = match[2];
			issue.column = match[3];
			issue.message = match[5].trim();
			issue.code = match[6];
			
			switch(match[4]) {
				case "Hint":
					issue.severity = IssueSeverity.Hint;
					break;
				case "Warning":
					issue.severity = IssueSeverity.Warning;
					break;
				case "Error":
					issue.severity = IssueSeverity.Error;
					break;
				default:
					issue.severity = IssueSeverity.Info;
					break;
			}
			
			issues.push(issue);			
		}
		
		console.log("checked issues");
		return issues;
	}
}