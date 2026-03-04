#version 450

layout(binding = 0) uniform UniformBufferObject {
    mat4 view;
    mat4 proj;
    vec3 cameraPos;
    float time;
} ubo;
layout(binding = 1) uniform sampler2D textureSamplers[3];

layout(location = 0) in vec3 inPosition;

layout(location = 1) in vec3 inInstancePosition;
layout(location = 2) in vec3 inInstanceColor;

layout(location = 0) out vec3 fragColor;

void main() {
    //Calculate the coordinates from which noise will be sampled
    vec2 mainNoiseCoord = vec2(inInstancePosition.x / 240.0f + ubo.time/20.0f, inInstancePosition.y / 160.0f + ubo.time/20.0f);
    vec2 secondaryNoiseCoord = vec2(inInstancePosition.x / 30.0f + ubo.time/10.0f + 0.5f, inInstancePosition.y / 30.0f + ubo.time/10.0f);
    
    //Apply noise for wind: primary wind is larger wind movments, and secondary wind is smaller flicks
    vec2 offset = vec2(0.0f);
    offset.x -= 2.0f * texture(textureSamplers[1], mainNoiseCoord).r * inPosition.z;
    offset.y -= 3.0f * texture(textureSamplers[1], mainNoiseCoord).r * inPosition.z;
    offset.x += 0.2f - texture(textureSamplers[1], secondaryNoiseCoord).r * inPosition.z;
    offset.y -= 0.2f - texture(textureSamplers[1], secondaryNoiseCoord).r * inPosition.z;

    //Used for keeping blade length constant
    float heightChange = 1.0f-sqrt(1.0f-offset.x*offset.x-offset.y*offset.y);

    //Billboarding
    vec3 cameraForward = normalize(vec3(ubo.view[0][2], ubo.view[1][2], ubo.view[2][2]));
    vec3 cameraRight = normalize(cross(vec3(0.0, 0.0, 1.0), cameraForward)); // Z is up
    vec3 adjustedPosition = inInstancePosition + vec3(offset.xy, -heightChange*inPosition.z) + inPosition.x * cameraRight + inPosition.z * vec3(0.0, 0.0, 1.0);

    //Sending information to fragment (pixel) shader
    gl_Position = ubo.proj * ubo.view * vec4(adjustedPosition, 1.0);
    fragColor = inInstanceColor;
}
