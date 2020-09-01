use shipyard::*;
use crate::world::AudioContextViewMut;
use web_sys::{AudioContext, OscillatorNode, OscillatorType, OscillatorOptions};
use wasm_bindgen::prelude::*;
use crate::config::AUDIO_DURATION;

/*
var osc = context.createOscillator(); // instantiate an oscillator
osc.type = 'sine'; // this is the default - also square, sawtooth, triangle
osc.frequency.value = 440; // Hz
osc.connect(context.destination); // connect it to the destination
osc.start(); // start the oscillator
osc.stop(context.currentTime + 2); // stop 2 seconds after the current tim
*/

pub struct AudioClip {
    pub osc_type:OscillatorType,
    pub duration:f64,
    pub frequency:f32, 
}

impl AudioClip {
    pub fn new(frequency:f32) -> Self {
        Self {
            osc_type: OscillatorType::Sine,
            duration: AUDIO_DURATION,
            frequency
        }
    }

    //TODO - make musical sense!
    //Something like: 440 * 2 ^ ((letter + 1) / 12)
    pub fn new_letter(letter:usize) -> Self {
       let freq = 200.0 + (800.0 / (letter as f64+1.0));
       Self::new(freq as f32)
    }
}
pub fn init_context(world:&World) {

    if world.try_borrow::<AudioContextViewMut>().is_err() {
        world.add_unique_non_send_sync(AudioContext::new().unwrap_throw());
    }
}

pub fn audio_sys(context:AudioContextViewMut, clips:View<AudioClip>) {
    (&clips).iter().for_each(|clip| {
        let mut opts = OscillatorOptions::new();
        opts.frequency(clip.frequency);
        opts.type_(clip.osc_type);
        let oscillator = OscillatorNode::new_with_options(&context,&opts).unwrap_throw();
        oscillator.connect_with_audio_node(&context.destination());
        oscillator.start();
        oscillator.stop_with_when(context.current_time() + clip.duration);
    });
}
