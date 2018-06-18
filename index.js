'use strict';
const logUpdate = require('log-update');
const chalk = require('chalk');
const figures = require('figures');
const indentString = require('indent-string');
const cliTruncate = require('cli-truncate');
const stripAnsi = require('strip-ansi');
const utils = require('./lib/utils');

const elegantSpinner = require('elegant-spinner');

const spinners = new WeakMap();

const renderHelper = (tasks, options, level) => {
	level = level || 0;

	let output = [];

	let i = 0;
	let j = 0;

	let pending = 0;
	for ( const t of tasks ) pending += ( !t.isCompleted() && !t.isSkipped() && !t.hasFailed() ) ;
	const ntasks = tasks.length;

	for (const task of tasks) {

		if (options.hide && task.isCompleted()) continue;

		if (task.isEnabled()) {

			const skipped = task.isSkipped() ? ` ${chalk.dim('[skipped]')}` : '';

			const nsubtasks = task.subtasks.length;

			if ( options.showSubtasks !== false && options.aggregate && nsubtasks > 0 ) {
				let done = 0;
				for ( const t of task.subtasks ) done += t.isCompleted();
				const ratio = (done / nsubtasks * 100).toFixed();
				const progress = `(${done}/${nsubtasks} ~ ${ratio}%)`;
				output.push(indentString(` ${utils.getSymbol(task, options)} ${task.title} ${progress} ${skipped}`, level, '  '));
			}
			else if ( options.hide ) {
				if ( i < options.maxsubtasks - 1 || pending <= options.maxsubtasks || task.hasFailed()  ) {
					i += 1;
					j += task.isPending();
					output.push(indentString(` ${utils.getSymbol(task, options)} ${task.title}${skipped}`, level, '  '));
				}
				else continue;
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

			if ((task.isPending() || task.hasFailed() || options.collapse === false) && (task.hasFailed() || options.showSubtasks !== false) && (task.hasFailed() || options.maxsubtasks > 0) && nsubtasks > 0) {
				let xoptions = options;
				if ( options.aggregate ) {
					xoptions = Object.assign( {} , options );
					xoptions.hide = true;
				}
				output = output.concat(renderHelper(task.subtasks, xoptions, level + 1));
			}
		}
	}

	if ( options.hide && options.maxsubtasks > 0 && pending - j > 0 ) {
		if ( !spinners.has( tasks ) ) {
			spinners.set( tasks , elegantSpinner() );
		}
		const spinner = spinners.get( tasks );
		output.push(indentString(` ${chalk.yellow(spinner())} ${pending-j} other tasks pending`, level, '  '));
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
			clearOutput: false,
			maxsubtasks: Infinity,
			hide: false,
			aggregate: false,
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
