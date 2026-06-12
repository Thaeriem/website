import * as THREE from "three"
import { WebGLRenderer, WebGLRenderTarget } from "three"
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass"

export default class RenderPixelatedPass extends Pass {

    fsQuad: FullScreenQuad
    resolution: THREE.Vector2
    scene: THREE.Scene
    camera: THREE.Camera
    rgbRenderTarget: WebGLRenderTarget

    constructor( resolution: THREE.Vector2, scene: THREE.Scene, camera: THREE.Camera ) {
        super()
        this.resolution = resolution
        this.fsQuad = new FullScreenQuad( this.material() )
        this.scene = scene
        this.camera = camera

        this.rgbRenderTarget = pixelRenderTarget( resolution, THREE.RGBAFormat, true )
    }

    render(
        renderer: WebGLRenderer,
        writeBuffer: WebGLRenderTarget
    ) {
        renderer.setRenderTarget( this.rgbRenderTarget )
        renderer.render( this.scene, this.camera )

        // @ts-ignore
        const uniforms = this.fsQuad.material.uniforms
        uniforms.tDiffuse.value = this.rgbRenderTarget.texture
        uniforms.tDepth.value = this.rgbRenderTarget.depthTexture

        if ( this.renderToScreen ) {
            renderer.setRenderTarget( null )
        } else {
            renderer.setRenderTarget( writeBuffer )
            if ( this.clear ) renderer.clear()
        }
        this.fsQuad.render( renderer )
    }

    material() {
        return new THREE.ShaderMaterial( {
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                resolution: {
                    value: new THREE.Vector4(
                        this.resolution.x,
                        this.resolution.y,
                        1 / this.resolution.x,
                        1 / this.resolution.y,
                    )
                }
            },
            vertexShader:
                `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
                `,
            fragmentShader:
                `
                uniform sampler2D tDiffuse;
                uniform sampler2D tDepth;
                uniform vec4 resolution;
                varying vec2 vUv;

                float getDepth(int x, int y) {
                    return texture2D( tDepth, vUv + vec2(x, y) * resolution.zw ).r;
                }

                float depthEdgeIndicator() {
                    float depth = getDepth(0, 0);
                    float diff = 0.0;
                    diff += clamp(getDepth(1, 0) - depth, 0.0, 1.0);
                    diff += clamp(getDepth(-1, 0) - depth, 0.0, 1.0);
                    diff += clamp(getDepth(0, 1) - depth, 0.0, 1.0);
                    diff += clamp(getDepth(0, -1) - depth, 0.0, 1.0);
                    return floor(smoothstep(0.01, 0.02, diff) * 2.) / 2.;
                }

                void main() {
                    vec4 texel = texture2D( tDiffuse, vUv );

                    float depthEdgeCoefficient = .05;

                    float dei = depthEdgeIndicator();

                    float coefficient = 1.0 - depthEdgeCoefficient * dei;
                    gl_FragColor = texel * coefficient;
                }
                `
        } )
    }
}

function pixelRenderTarget( resolution: THREE.Vector2, pixelFormat: THREE.PixelFormat, depthTexture: boolean ) {
    const renderTarget = new WebGLRenderTarget(
        resolution.x, resolution.y,
        !depthTexture ?
            undefined
            : {
                depthTexture: new THREE.DepthTexture(
                    resolution.x,
                    resolution.y
                ),
                depthBuffer: true
            }
    )
    renderTarget.texture.format = pixelFormat
    renderTarget.texture.minFilter = THREE.NearestFilter
    renderTarget.texture.magFilter = THREE.NearestFilter
    renderTarget.texture.generateMipmaps = false
    renderTarget.stencilBuffer = false
    return renderTarget
}
