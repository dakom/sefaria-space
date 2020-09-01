use awsm_web::tick::{MainLoop, MainLoopOptions, Raf};
use std::rc::Rc;
use shipyard::*;
use wasm_bindgen::prelude::*;
use crate::world::{
    TICK_BEGIN,
    TICK_UPDATE,
    TICK_DRAW,
    TICK_END,
};

#[derive(Default)]
pub struct TickBegin {
    pub time: f64,
    pub delta: f64
}


#[derive(Default)]
pub struct TickUpdate{
    pub delta: f64
}

#[derive(Default)]
pub struct TickDraw{
    pub interpolation: f64
}

#[derive(Default)]
pub struct TickEnd{
    pub fps: f64,
    pub abort: bool
}

pub fn start(world:Rc<World>) {
    let game_loop = Box::new(GameLoop::new(world).unwrap_throw());
    std::mem::forget(game_loop);
}

struct GameLoop {
    _raf:Raf
}

impl GameLoop {
    fn new(world:Rc<World>) -> Result<Self, JsValue> {
        // loop was ported from https://github.com/IceCreamYou/MainLoop.js#usage
        let begin = {
            let world = Rc::clone(&world);
            move |time, delta| {
                {
                    world.run(|mut tick:UniqueViewMut<TickBegin>| {
                        tick.time = time;
                        tick.delta = delta;
                    })
                }

                world.run_workload(TICK_BEGIN);
            }
        };

        let update = {
            let world = Rc::clone(&world);
            move |delta| {
                {
                    world.run(|mut tick:UniqueViewMut<TickUpdate>| {
                        tick.delta = delta;
                    })
                }

                world.run_workload(TICK_UPDATE);
            }
        };

        let draw = {
            let world = Rc::clone(&world);
            move |interpolation| {
                {
                    world.run(|mut tick:UniqueViewMut<TickDraw>| {
                        tick.interpolation = interpolation;
                    })
                }

                world.run_workload(TICK_DRAW);
            }
        };

        let end = {
            let world = Rc::clone(&world);
            move |fps, abort| {
                {
                    world.run(|mut tick:UniqueViewMut<TickEnd>| {
                        tick.fps = fps;
                        tick.abort = abort;
                    })
                }

                world.run_workload(TICK_END);
            }
        };

        let _raf= Raf::new({
            let mut main_loop = MainLoop::new(MainLoopOptions::default(), begin, update, draw, end);
            move |ts| {
                main_loop.tick(ts);
            }
        });


        Ok(Self{
            _raf
        })
    }
}
