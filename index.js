'use strict';
const logUpdate = require('log-update');
const chalk = require('chalk');
const figures = require('figures');
const indentString = require('indent-string');
const cliTruncate = require('cli-truncate');
const stripAnsi = require('strip-ansi');
const utils = require('./lib/utils');

const renderHelper = (tasks, options, level) => {
	level = level || 0;

	let output = [];

	for (const task of tasks) {

		if (options.hide === true && task.isCompleted()) continue;

		if (task.isEnabled()) {

			const skipped = task.isSkipped() ? ` ${chalk.dim('[skipped]')}` : '';

			if ( options.showSubtasks !== false && options.aggregate === true && task.subtasks.length > 0 ) {
				let done = 0;
				for ( const t of task.subtasks ) done += t.isCompleted();
				let total = task.subtasks.length;
				let ratio = (done / total * 100).toFixed();
				let progress = `(${done}/${total} ~ ${ratio}%)`;
				output.push(indentString(` ${utils.getSymbol(task, options)} ${task.title} ${progress} ${skipped}`, level, '  '));
			}
			else {
				output.push(indentString(` ${utils.getSymbol(task, options)} ${task.title}${skipped}`, level, '  '));
			}

			if ((task.isPending() || task.isSkipped() || task.hasFailed()) && utils.isDefined(task.output)) {
				let data = task.output;

				if (typeof data === 'string') {
					data = stripAnsi(data.trim().split('\n').filter(Boolean).pop());

					if (data === '') {
						data = undefined;
					}
				}

				if (utils.isDefined(data)) {
					const out = indentString(`${figures.arrowRight} ${data}`, level, '  ');
					output.push(`   ${chalk.gray(cliTruncate(out, process.stdout.columns - 3))}`);
				}
			}

			if ((task.isPending() || task.hasFailed() || options.collapse === false) && (task.hasFailed() || options.showSubtasks !== false) && task.subtasks.length > 0) {
				let xoptions = options;
				if ( options.aggregate === true ) {
					xoptions = { hide: true };
					Object.assign( xoptions , options );
				}
				output = output.concat(renderHelper(task.subtasks, xoptions, level + 1));
			}
		}
	}

	return output.join('\n');
};

const render = (tasks, options) => {
	logUpdate(renderHelper(tasks, options));
};

class UpdateRenderer {

	constructor(tasks, options) {
		this._tasks = tasks;
		this._options = Object.assign({
			showSubtasks: true,
			collapse: true,
			clearOutput: false
		}, options);
	}

	render() {
		if (this._id) {
			// Do not render if we are already rendering
			return;
		}

		this._id = setInterval(() => {
			render(this._tasks, this._options);
		}, 100);
	}

	end(err) {
		if (this._id) {
			clearInterval(this._id);
			this._id = undefined;
		}

		render(this._tasks, this._options);

		if (this._options.clearOutput && err === undefined) {
			logUpdate.clear();
		} else {
			logUpdate.done();
		}
	}
}

module.exports = UpdateRenderer;
