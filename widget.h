#ifndef WIDGET_H
#define WIDGET_H

#include <QGLWidget>
#include <QGLShaderProgram>

#include <QTime>


#include <opencv2/core/core.hpp>
#include <opencv2/highgui/highgui.hpp>


class Widget : public QGLWidget
{
    Q_OBJECT
    
public:
    Widget(QWidget *parent = 0);
    ~Widget();

private:
    void initializeGL();
    void resizeGL(int w, int h);
    void paintGL();
    void timerEvent(QTimerEvent *);
    void mousePressEvent(QMouseEvent *e);
    void mouseMoveEvent(QMouseEvent *e);
    void wheelEvent(QWheelEvent *e);

    QGLShaderProgram *_program;
    GLuint _texture0;
    GLuint _texture1;

    QTime _t;
    int _fps;
    int _fpsid;

    float _angle1, _angle2;
    QPoint _last;
    float _zoom;
    QVector3D _origin;


    CvCapture *_camera;
    int _cvid;
};

#endif // WIDGET_H
