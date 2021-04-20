const events = require('events');

class Queue {
    constructor () {
        this.q = [];
        this.eventEmitter = new events.EventEmitter();
    }
    /**
     * 
     * @param {any}
     */
    push(item) {
        this.q.push(item);
        this.eventEmitter.emit('queue-updated');
    }

    /**
     * 
     */
    getNext() {
        return new Promise ((resolve) => {
            if (this.q.length > 0) {
                resolve(this.q[0]);
                this.q.shift();
                return;
            }
            this.EventEmitter.once('queue-updated', () => {
                if (this.q.length === 0) {
                    resolve(undefined);
                    return;
                }
                resolve(this.q[0]);
                this.q.shift();
            });

        });
    }

    /**
     * 
     */
    clearAndStop() {
        this.q = [];
        this.EventEmitter.emit('queue-updated');
    }

    /**
     * 
     */
    length() {
        return this.q.length;
    }
}
module.exports = {
    Queue,
}