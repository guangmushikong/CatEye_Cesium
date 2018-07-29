defineSuite([
        'Scene/PostProcessStage',
        'Core/BoundingRectangle',
        'Core/Color',
        'Core/defined',
        'Core/PixelFormat',
        'Renderer/PixelDatatype',
        'Scene/PostProcessStageSampleMode',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        PostProcessStage,
        BoundingRectangle,
        Color,
        defined,
        PixelFormat,
        PixelDatatype,
        PostProcessStageSampleMode,
        createScene,
        pollToPromise,
        when) {
    'use strict';

    var scene;

    beforeAll(function() {
        scene = createScene();
        scene.postProcessStages.fxaa.enabled = false;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.postProcessStages.removeAll();
    });

    it('constructs', function() {
        var fragmentShader = 'uniform vec4 color; void main() { gl_FragColor = color; }';
        var uniforms = { color : Color.clone(Color.RED) };
        var textureScale = 0.5;
        var forcePowerOfTwo = true;
        var sampleMode = PostProcessStageSampleMode.LINEAR;
        var pixelFormat = PixelFormat.RGB;
        var pixelDatatype = PixelDatatype.UNSIGNED_INT;
        var clearColor = Color.clone(Color.BLUE);
        var scissorRectangle = new BoundingRectangle(0, 0, 5, 5);
        var name = 'wonka vision';

        var stage = new PostProcessStage({
            fragmentShader : fragmentShader,
            uniforms : uniforms,
            textureScale : textureScale,
            forcePowerOfTwo : forcePowerOfTwo,
            sampleMode : sampleMode,
            pixelFormat : pixelFormat,
            pixelDatatype : pixelDatatype,
            clearColor : clearColor,
            scissorRectangle : scissorRectangle,
            name : name
        });
        expect(stage.fragmentShader).toEqual(fragmentShader);
        expect(stage.uniforms.color).toBeDefined();
        expect(stage.textureScale).toEqual(textureScale);
        expect(stage.forcePowerOfTwo).toEqual(forcePowerOfTwo);
        expect(stage.sampleMode).toEqual(sampleMode);
        expect(stage.pixelFormat).toEqual(stage.pixelFormat);
        expect(stage.pixelDatatype).toEqual(pixelDatatype);
        expect(stage.clearColor).toEqual(clearColor);
        expect(stage.scissorRectangle).toEqual(scissorRectangle);
        expect(stage.name).toEqual(name);
        expect(stage.outputTexture).not.toBeDefined();
    });

    it('default constructs', function() {
        var fragmentShader = 'void main() { gl_FragColor = vec4(1.0); }';

        var stage = new PostProcessStage({
            fragmentShader : fragmentShader
        });
        expect(stage.fragmentShader).toEqual(fragmentShader);
        expect(stage.uniforms).not.toBeDefined();
        expect(stage.textureScale).toEqual(1.0);
        expect(stage.forcePowerOfTwo).toEqual(false);
        expect(stage.sampleMode).toEqual(PostProcessStageSampleMode.NEAREST);
        expect(stage.pixelFormat).toEqual(PixelFormat.RGBA);
        expect(stage.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
        expect(stage.clearColor).toEqual(Color.BLACK);
        expect(stage.scissorRectangle).toEqual(new BoundingRectangle());
        expect(stage.name).toBeDefined();
        expect(stage.outputTexture).not.toBeDefined();
    });

    it('throws without fragment shader', function() {
        expect(function() {
            return new PostProcessStage();
        }).toThrowDeveloperError();
    });

    it('throws with invalid texture scale', function() {
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        expect(function() {
            return new PostProcessStage({
                fragmentShader : fs,
                textureScale : -1.0
            });
        }).toThrowDeveloperError();
        expect(function() {
            return new PostProcessStage({
                fragmentShader : fs,
                textureScale : 2.0
            });
        }).toThrowDeveloperError();
    });

    it('throws if pixel format is not a color format', function() {
        expect(function() {
            return new PostProcessStage({
                fragmentShader : 'void main() { gl_FragColor = vec4(1.0); }',
                pixelFormat : PixelFormat.DEPTH_STENCIL
            });
        }).toThrowDeveloperError();
    });

    it('executes', function() {
        expect(scene).toRender([0, 0, 0, 255]);
        scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        }));
        scene.renderForSpecs(); // render one frame so the stage is ready
        expect(scene).toRender([255, 255, 0, 255]);
    });

    it('can use a texture uniform', function() {
        expect(scene).toRender([0, 0, 0, 255]);
        var stage = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'uniform sampler2D texture; varying vec2 v_textureCoordinates; void main() { gl_FragColor = texture2D(texture, v_textureCoordinates); }',
            uniforms : {
                texture : './Data/Images/Green2x2.png'
            }
        }));
        return pollToPromise(function() {
            scene.renderForSpecs();
            return stage.ready;
        }).then(function() {
            expect(scene).toRender([0, 255, 0, 255]);
            stage.uniforms.texture = './Data/Images/Blue2x2.png';
            return pollToPromise(function() {
                scene.renderForSpecs();
                return stage.ready;
            }).then(function() {
                expect(scene).toRender([0, 0, 255, 255]);
            });
        });
    });

    it('can use a image uniform', function() {
        var ready = false;
        var image = new Image();
        image.src = './Data/Images/Blue2x2.png';
        image.onload = function() { ready = true; };

        return pollToPromise(function() {
            return ready;
        }).then(function() {
            expect(scene).toRender([0, 0, 0, 255]);
            var stage = scene.postProcessStages.add(new PostProcessStage({
                fragmentShader : 'uniform sampler2D texture; void main() { gl_FragColor = texture2D(texture, vec2(0.5)); }',
                uniforms : {
                    texture : image
                }
            }));
            return pollToPromise(function() {
                scene.renderForSpecs();
                return stage.ready;
            }).then(function() {
                expect(scene).toRender([0, 0, 255, 255]);
            });
        });
    });

    it('isSupported throws without a scene', function() {
        var stage = new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0); }'
        });
        expect(function() {
            return stage.isSupported();
        }).toThrowDeveloperError();
    });

    it('isSupported', function() {
        var stage = new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0); }'
        });
        expect(stage.isSupported(scene)).toEqual(true);
        stage = new PostProcessStage({
            fragmentShader : 'uniform sampler2D depthTexture; void main() { texture2D(depthTexture, vec2(0.5)); }'
        });
        expect(stage.isSupported(scene)).toEqual(scene.context.depthTexture);
    });

    it('does not run a stage that requires depth textures when depth textures are not supported', function() {
        var s = createScene();
        s.context._depthTexture = false;

        if (defined(s._globeDepth)) {
            s._globeDepth.destroy();
            s._globeDepth = undefined;
            if (defined(s._oit)) {
                s._oit.destroy();
                s._oit = undefined;
            }
        }

        expect(s).toRender([0, 0, 0, 255]);
        var stage = s.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'uniform sampler2D depthTexture; void main() { gl_FragColor = vec4(1.0); }'
        }));
        return pollToPromise(function() {
            s.renderForSpecs();
            return stage.ready;
        }).then(function() {
            expect(s).toRender([0, 0, 0, 255]);
        }).always(function(e) {
            s.destroyForSpecs();
            if (e) {
                return when.reject(e);
            }
        });
    });

    it('destroys', function() {
        var stage = new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0); }'
        });
        expect(stage.isDestroyed()).toEqual(false);
        stage.destroy();
        expect(stage.isDestroyed()).toEqual(true);
    });

}, 'WebGL');
