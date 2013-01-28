#version 130

struct material {
    float phong_factor; // between 0 and 1
    vec3 ambiant;
    vec3 diffuse;

    float opacity; // between 0 and 1
    float eta; // index inside the material, behind the normal direction
};

struct sphere {
    vec3 center;
    float radius;
    material mat;
};

struct plan {
    vec3 point;
    vec3 normal;
    material mat;
};

struct ray {
    float factor;
    vec3 origin;
    vec3 direction;
};

in vec3 first_ray; // direction du rayon qui part de l'origine (0,0,0)
uniform vec3 light; // position de la lumire
uniform sphere spheres[16];
out vec4 pixelColor;

// retourne la distance minimale strictement positive
bool line_sphere_intersection(in vec3 origin, in vec3 direction, in vec3 center, in float radius, out float dist);
bool line_plan_intersection(in vec3 origin, in vec3 direction, in vec3 basis, in vec3 normal, out float dist);

int next_sphere_intersection(in vec3 origin, in vec3 direction, out float dist);

vec3 send_ray(in ray r);

bool refraction(in vec3 v, in vec3 n, in float cos, out vec3 t, in float eta);
float fresnel(in float cosi, in float cost, in float eta);

const float fuzzy = 5e-5;

ray queue[32];
int queue_size;

void main(void)
{
    vec3 color = vec3(0.0, 0.0, 0.0);

    queue[0] = ray(1.0, vec3(0.0, 0.0, 0.0), normalize(first_ray));
    queue_size = 1;

    int ray_count = 0;

    while (ray_count++ < 16) {
        int ii = 0;
        for (int i = 1; i < queue_size; ++i)
            if (queue[i].factor > queue[ii].factor)
                ii = i;

        if (queue[ii].factor == 0.0) break;
        color += send_ray(queue[ii]);
        queue[ii].factor = 0.0; // disable ray from the queue
    }

    pixelColor = vec4(color, 1.0);
}

bool line_sphere_intersection(in vec3 origin, in vec3 direction, in vec3 center, in float radius, out float dist)
{
    dist = 0.0;

    vec3 x = origin - center;
    float a = dot(direction, direction);
    float b = 2.0 * dot(direction, x);
    float c = dot(x, x) - radius * radius;
    float delta = b * b - 4.0 * a * c;
    if (delta < 0.0)
        return false;
    if (c < 0.0) {
        // in the sphere
        dist = (-b + sqrt(delta)) / (2.0 * a);
    } else {
        // out of the sphere
        dist = (-b - sqrt(delta)) / (2.0 * a);
    }

    if (dist <= 0.0)
        return false;
    return true;
}

bool line_plan_intersection(in vec3 origin, in vec3 direction, in vec3 basis, in vec3 normal, out float dist)
{
    return false;
}

int next_sphere_intersection(in vec3 origin, in vec3 direction, out float dist)
{
    dist = 0.0;
    int ii = -1;
    for (int i = 0; i < 10; ++i) {
        if (spheres[i].radius == 0.0)
            break;

        float d;
        if (line_sphere_intersection(origin, direction, spheres[i].center, spheres[i].radius, d)) {
            if (dist == 0.0 || d < dist) {
                dist = d;
                ii = i;
            }
        }
    }
    return ii;
}

vec3 send_ray(in ray r)
{
    vec3 color = vec3(0.0, 0.0, 0.0);
    float dist = 0.0;

    // cherche la collision
    int k = next_sphere_intersection(r.origin, r.direction, dist);
    if (k == -1)
        return color;

    vec3 p = r.origin + dist * r.direction;
    vec3 n = (p - spheres[k].center) / spheres[k].radius;
    float cos = dot(r.direction, n);
    vec3 i = r.direction - 2.0 * cos * n;

    // phong
    if (spheres[k].mat.phong_factor > 0.0) {
        if (next_sphere_intersection(p + fuzzy * light, light, dist) == -1) {
            float dfactor = clamp(dot(light, n), 0.0, 1.0);
            float sfactor = pow(clamp(dot(light, i), 0.0, 1.0), 4.0);
            color += dfactor * spheres[k].mat.diffuse + sfactor * vec3(1.0, 1.0, 1.0);
        }
        color += spheres[k].mat.ambiant;
        color *= spheres[k].mat.phong_factor;
    }

    // reflexion
    if (spheres[k].mat.phong_factor < 1.0 && queue_size < 32) {
        vec3 t = vec3(0.0, 0.0, 0.0);
        float freflect = 1.0;
        if (spheres[k].mat.opacity < 1.0 && refraction(r.direction, n, cos, t, spheres[k].mat.eta)) {
            float frefract = (1.0 - fresnel(cos, dot(t, n), spheres[k].mat.eta)) * (1.0 - spheres[k].mat.opacity);
            freflect = 1.0 - frefract;

            if (dot(r.direction, t) < 0.0) color = vec3(0.0, 1.0, 0.0);
            queue[queue_size++] = ray(r.factor * (1.0 - spheres[k].mat.phong_factor) * frefract, p + fuzzy * t, t);
        }
        if (queue_size < 32)
            queue[queue_size++] = ray(r.factor * (1.0 - spheres[k].mat.phong_factor) * freflect, p + fuzzy * i, i);
    }

    return r.factor * color;
}

bool refraction(in vec3 v, in vec3 n, in float cos, out vec3 t, in float eta)
{
    // cos = v * n

    float eta2;

    if (cos > 0.0)
        eta2 = eta;
    else
        eta2 = 1.0 / eta;

    float sin2 = eta2*eta2 * (1.0 - cos*cos);

    if (sin2 > 1.0)
        return false;

    float k = eta2 * cos + sqrt(1.0 - sin2);

    t = eta2 * v - k * n;

    if (dot(v, n) < 0.0)
        t = refract(v, n, eta);
    else
        t = refract(v, -n, 1.0/eta);

    return true;
}

float fresnel(in float cosi, in float cost, in float eta)
{
    // cosi = v*n
    // cost = t*n

    if (cosi > 0.0) {
        float rs = (eta * cosi - cost) / (eta * cosi + cost);
        float rp = (eta * cost - cosi) / (eta * cost + cosi);

        return (rs*rs + rp*rp) / 2.0;
    } else {
        float rs = (cosi - eta * cost) / (cosi + eta * cost);
        float rp = (cost - eta * cosi) / (cost + eta * cosi);

        return (rs*rs + rp*rp) / 2.0;
    }
}
