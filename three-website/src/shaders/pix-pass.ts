import * as THREE from "three"
import { WebGLRenderer, WebGLRenderTarget } from "three"
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass"

export default class RenderPixelatedPass extends Pass {

    fsQuad: FullScreenQuad
    resolution: THREE.Vector2
    scene: THREE.Scene
    camera: THREE.Camera
    rgbRenderTarget: WebGLRenderTarget
    edgeStrength: number
    pixelScale: number

    constructor( screenResolution: THREE.Vector2, scene: THREE.Scene, camera: THREE.Camera, pixelScale = 4 ) {
        super()
        this.pixelScale = pixelScale
        this.resolution = pixelResolution(screenResolution, this.pixelScale)
        this.fsQuad = new FullScreenQuad( this.material() )
        this.scene = scene
        this.camera = camera
        this.edgeStrength = 0.05

        this.rgbRenderTarget = pixelRenderTarget( this.resolution, THREE.RGBAFormat, true )
    }

    setSize( width: number, height: number ) {
        const nextResolution = pixelResolution(new THREE.Vector2(width, height), this.pixelScale)
        const pixelWidth = nextResolution.x
        const pixelHeight = nextResolution.y

        this.resolution.set(pixelWidth, pixelHeight)
        this.rgbRenderTarget.setSize(pixelWidth, pixelHeight)

        if (this.rgbRenderTarget.depthTexture) {
            this.rgbRenderTarget.depthTexture.image.width = pixelWidth
            this.rgbRenderTarget.depthTexture.image.height = pixelHeight
        }

        // @ts-ignore
        const uniforms = this.fsQuad.material.uniforms
        uniforms.resolution.value.set(
            pixelWidth,
            pixelHeight,
            1 / pixelWidth,
            1 / pixelHeight
        )
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
        uniforms.edgeStrength.value = this.edgeStrength

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
                edgeStrength: { value: 0.05 },
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
                uniform float edgeStrength;
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

                    if (edgeStrength <= 0.0) {
                        gl_FragColor = texel;
                        return;
                    }

                    float dei = depthEdgeIndicator();

                    float coefficient = 1.0 - edgeStrength * dei;
                    gl_FragColor = texel * coefficient;
                }
                `
        } )
    }
}

function pixelResolution( screenResolution: THREE.Vector2, pixelScale: number ) {
    return new THREE.Vector2(
        Math.max(1, Math.floor(screenResolution.x / pixelScale)),
        Math.max(1, Math.floor(screenResolution.y / pixelScale))
    )
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
