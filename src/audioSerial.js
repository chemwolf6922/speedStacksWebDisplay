// @ts-check
export class AudioSerial{
    /** @type {AudioContext|undefined} */
    #audioContext;
    /** @type {ReadableStream<Uint8Array>} */
    readable;
    /** @type {((undefined)=>void)|undefined} */
    #resolveInputPromise;
    /** @type {Array<number>} */
    #cache = [];
    #cacheSize;

    /**
     * 
     * @param {{
     *      cacheSize:number
     * }} params 
     */
    constructor(params) {
        this.readable = new ReadableStream({pull:this.#pull.bind(this)});
        this.#cacheSize = params.cacheSize;
    }

    async open(){
        if(this.#audioContext!==undefined){
            throw new Error('reinit');
        }   
        const stream = await navigator.mediaDevices.getUserMedia({audio:true});
        this.#audioContext = new AudioContext();
        await this.#audioContext.audioWorklet.addModule('serialDataProcessor.js');
        const source = this.#audioContext.createMediaStreamSource(stream);
        const serialDataNode = new AudioWorkletNode(this.#audioContext,'serialDataProcessor');
        serialDataNode.port.onmessage = this.#onMessage.bind(this);
        source.connect(serialDataNode);
    }

    async close(){
        await this.#audioContext?.close();
        this.#audioContext = undefined;
    }

    /**
     * @param {ReadableStreamDefaultController<Uint8Array>} controller 
     */
    async #pull(controller){
        if(this.#cache.length===0){
            await new Promise(resolve=>{
                this.#resolveInputPromise = resolve;
            });
            this.#resolveInputPromise = undefined;
        }
        let result = new Uint8Array(this.#cache);
        this.#cache = [];
        controller.enqueue(result);
    }

    /**
     * @param {{
     *      data:number
     * }} e 
     */
    #onMessage(e){
        this.#cache.push(e.data);
        if(this.#cache.length > this.#cacheSize){
            this.#cache.shift();
        }
        if(this.#resolveInputPromise!==undefined){
            this.#resolveInputPromise(undefined);
        }
    }
}

