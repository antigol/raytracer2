#version 130

in vec2 vertex;
uniform float aspect;
out vec3 first_ray;

void main(void)
{
    first_ray = vec3(vertex.x * aspect, vertex.y, -1.428); // 70 degrees
    gl_Position = vec4(vertex, 0.0, 1.0);
}
