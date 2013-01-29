#version 130

struct material {
    float phong_factor; // between 0 and 1
    vec3 ambiant;
    vec3 diffuse;

    // eta == 0 -> no refraction, only relfection
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
    vec3 width;
    vec3 height;
    material mat;
};

struct ray {
    float factor;
    vec3 origin;
    vec3 direction;
};

in vec3 first_ray; // direction du rayon qui part de camera
uniform vec3 camera; // point de dpart du rayon
uniform vec3 light; // position de la lumire
uniform sphere spheres[4];
uniform plan plans[2];
uniform samplerCube cubemap;
out vec4 pixelColor;

bool refraction(in vec3 v, in vec3 n, in float cos, out vec3 t, in float eta);

// retourne la distance minimale strictement positive
bool line_sphere_intersection(in vec3 origin, in vec3 direction, in sphere s, out float dist);
bool line_plan_intersection(in vec3 origin, in vec3 direction, in vec3 point, in vec3 normal, in vec3 width, in vec3 height, out float dist);

bool next_intersection(inout vec3 origin, in vec3 direction, out vec3 normal, out material mat);
bool light_intersection(in vec3 origin, in vec3 direction, out material mat);

const float fuzzy = 5e-4;

const int maxrays = 8;

void main(void)
{
    vec3 color = vec3(0.0, 0.0, 0.0);

    ray r;
    r.factor = 1.0;
    r.origin = camera;
    r.direction = normalize(first_ray);

    for (int ray_count = 0; ray_count < maxrays; ++ray_count) {
        float d = 0.0;

        // collision
        vec3 n;
        material m;
        if (!next_intersection(r.origin, r.direction, n, m)) {
            color += r.factor * textureCube(cubemap, r.direction).rgb;
            break;
        }

        float cos = dot(r.direction, n);
        vec3 i = r.direction - 2.0 * cos * n;

        // phong
        if (m.phong_factor > 0.0) {
            float lfactor = 1.0; // light
            float dfactor = 0.0; // diffuse
            float sfactor = 0.0; // specular

            material mm;
            if (light_intersection(r.origin + fuzzy * light, light, mm))
                lfactor = mm.eta > 0.0 ? (1.0 - mm.phong_factor) : 0.0;

            if (lfactor > 0.0) { // if we are not in the shadow
                dfactor = clamp(dot(light, n), 0.0, 1.0);
                sfactor = pow(clamp(dot(light, i), 0.0, 1.0), 4.0);
            }
            color += r.factor * m.phong_factor * (m.ambiant + lfactor * dfactor * m.diffuse + sfactor * vec3(1.0, 1.0, 1.0));
        }

        // reflexion
        if (m.phong_factor < 1.0 && ray_count + 1 < maxrays) {
            vec3 t;

            if (m.eta > 0.0 && refraction(r.direction, n, cos, t, m.eta)) {
                r.factor *= 1.0 - m.phong_factor;
                r.origin += fuzzy * t;
                r.direction = t;
            } else {
                r.factor *= 1.0 - m.phong_factor;
                r.origin += fuzzy * i;
                r.direction = i;
            }
        } else {
            break;
        }
    }

    pixelColor = vec4(color, 1.0);
}

bool refraction(in vec3 v, in vec3 n, in float cos, out vec3 t, in float eta)
{ // cos = dot(v,n)
    if (cos < 0.0) {
        //        t = refract(v, n, 1.0 / eta);
        float k = 1.0 - (1.0 - cos * cos) / eta / eta;
        if (k < 0.0)
            return false;
        t = v / eta - (cos / eta + sqrt(k)) * n;
    } else {
        //        t = refract(v, -n, eta);
        float k = 1.0 - eta * eta * (1.0 - cos * cos); // -a * -a = a * a
        if (k < 0.0)
            return false;
        t = eta * v + (-eta * cos + sqrt(k)) * n; // -n
    }
    return true;
}

bool line_sphere_intersection(in vec3 origin, in vec3 direction, in sphere s, out float dist)
{
    vec3 x = origin - s.center;
    float a = dot(direction, direction);
    float b = 2.0 * dot(direction, x);
    float c = dot(x, x) - s.radius * s.radius;
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
    return dist > 0.0;
}

bool line_plan_intersection(in vec3 origin, in vec3 direction, in plan p, out float dist)
{
    vec3 x = p.point - origin;
    float vn = dot(direction, p.normal);
    if (vn == 0.0)
        return false;
    dist = dot(x, p.normal) / vn;
    if (dist <= 0.0)
        return false;
    vec3 pos = origin + dist * direction - p.point;

    float w = dot(pos, p.width) / dot(p.width, p.width);
    if (w > 1.0 || w < 0.0) return false;

    float h = dot(pos, p.height) / dot(p.height, p.height);
    if (h > 1.0 || h < 0.0) return false;
    return true;
}

bool next_intersection(inout vec3 origin, in vec3 direction, out vec3 normal, out material mat)
{
    float d;
    float dmin = 1e38;

    int ii = -1;
    for (int i = 0; i < 8; ++i) {
        if (spheres[i].radius == 0.0)
            break;

        if (line_sphere_intersection(origin, direction, spheres[i], d)) {
            if (d < dmin) {
                dmin = d;
                ii = i;
            }
        }
    }
    int jj = -1;
    for (int j = 0; j < 8; ++j) {
        if (plans[j].mat.eta < 0.0)
            break;

        if (line_plan_intersection(origin, direction, plans[j], d)) {
            if (d < dmin) {
                dmin = d;
                jj = j;
            }
        }
    }

    if (jj != -1) {
        origin += direction * dmin;
        normal = plans[jj].normal;
        mat = plans[jj].mat;
        return true;
    } else if (ii != -1) {
        origin += direction * dmin;
        normal = (origin - spheres[ii].center) / spheres[ii].radius;
        mat = spheres[ii].mat;
        return true;
    } else {
        return false;
    }
}

bool light_intersection(in vec3 origin, in vec3 direction, out material mat)
{
    vec3 tmp = origin;
    vec3 n;
    return next_intersection(tmp, direction, n, mat);
}
