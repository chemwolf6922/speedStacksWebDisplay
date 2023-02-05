class RingBuffer{
    #head;
    #tail;
    #buffer;
    /**
     * @param {{
     *      length:number
     * }} params 
     */
    constructor(params) {
        this.#buffer = new Uint8Array(params.length+1);
        this.#head = 0;
        this.#tail = 0;
    }

    /**
     * @param {Uint8Array} data 
     */
    push(data){
        let oldLength = this.length;
        if(data.length > this.#buffer.length-1)
            data = data.slice(data.length-(this.#buffer.length-1));
        if(data.length + this.#tail > this.#buffer.length){
            this.#buffer.set(data.slice(0,this.#buffer.length-this.#tail),this.#tail);
            this.#buffer.set(data.slice(this.#buffer.length-this.#tail),0);
        }else{
            this.#buffer.set(data,this.#tail);
        }
        this.#tail = (this.#tail+data.length)%this.#buffer.length;
        if(oldLength+data.length > this.#buffer.length-1){
            this.#head = (this.#tail+1)%this.#buffer.length;
        }
    }

    /**
     * @param {number} index 
     */
    at(index){
        if(index >= this.length)
            throw new Error('out of bound');
        return this.#buffer[(this.#head+index)%this.#buffer.length];
    }
    
    /**
     * @param {number} v
     */
    set head(v){
        if(v<0)
            return;
        if(v>=this.length){
            this.#head = this.#tail;    /** clear the buffer */
        }else{
            this.#head = (this.#head+v)%this.#buffer.length;
        }
    }

    get length(){
        return this.#tail>=this.#head?this.#tail-this.#head:this.#tail+this.#buffer.length-this.#head;
    }

    dump(){
        if(this.#tail > this.#head){
            console.log(this.#buffer.slice(this.#head,this.#tail));
        }else{
            let part1 = this.#buffer.slice(this.#head);
            let part2 = this.#buffer.slice(0,this.#tail);
            let result = new Uint8Array(part1.length+part2.length);
            result.set(part1,0);
            result.set(part2,part1.length);
            console.log(result);
        }
    }
}

const ONE_BIT_POINTS = 1/1200*sampleRate;   /** 1200 baud rate */
const ONE_BYTE_POINTS = ONE_BIT_POINTS*10>>>0;   /** 1200 baud rate, 10 bits */
const LOGIC_EDGE_TH = 0.4;

class SerialDataProcessor extends AudioWorkletProcessor{
    #buffer;
    #logicState;
    #lastValue;
    #lastValue2;
    constructor(params) {
        super(params);
        this.#buffer = new RingBuffer({length:ONE_BYTE_POINTS*2});
        this.#logicState = 1;    /** default to 1 (idle) */
        this.#lastValue = 0;
        this.#lastValue2 = 0;
    }

    /**
     * @param {Array<Array<Float32Array>>} inputs 
     * @param {Array<Array<Float32Array>>} outputs 
     * @param {object} paramters 
     * @returns 
     */
    process(inputs,outputs,paramters){
        const input = inputs[0];
        /** quantize data */
        let logicResult = new Uint8Array(input[0].length);
        for(let i=0;i<input[0].length;i++){
            if(input[0][i] - this.#lastValue2 > LOGIC_EDGE_TH){
                /** inverted falling edge */
                this.#logicState = 0;
            }else if(this.#lastValue2 - input[0][i] > LOGIC_EDGE_TH){
                /** inverted rising edge */
                this.#logicState = 1;
            }
            logicResult[i] = this.#logicState;
            this.#lastValue2 = this.#lastValue;
            this.#lastValue = input[0][i];
        }
        this.#buffer.push(logicResult);
        /** process data */
        let startBitIndex = -1;
        for(let i=0;i<this.#buffer.length-1;i++){
            if(this.#buffer.at(i)===1&&this.#buffer.at(i+1)===0){
                startBitIndex = i;
                break;
            }
        }
        if(startBitIndex<0){
            /** no data, clear buffer */
            this.#buffer.head = this.#buffer.length;
        }else{
            if(this.#buffer.length > ONE_BYTE_POINTS + startBitIndex){
                /** can parse data */
                let serialData = 0;
                let indexs = new Uint32Array(8);
                let bits = new Uint8Array(8);
                for(let i=7;i>=0;i--){
                    indexs[i] = startBitIndex+(ONE_BIT_POINTS*(i+1.5))>>>0;
                    bits[i] = this.#buffer.at(startBitIndex+(ONE_BIT_POINTS*(i+1.5))>>>0) & 1;
                    serialData = (serialData << 1) | (this.#buffer.at(startBitIndex+(ONE_BIT_POINTS*(i+1.5))>>>0) & 1);
                }
                this.#buffer.head = startBitIndex + (ONE_BIT_POINTS*9.5)>>>0;
                this.port.postMessage(serialData);
            }else{
                /** set buffer to start of the edge and wait for more data */
                this.#buffer.head = startBitIndex;
            }
        }
        
        return true;
    }
}

registerProcessor("serialDataProcessor", SerialDataProcessor);
