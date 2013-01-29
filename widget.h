#ifndef WIDGET_H
#define WIDGET_H

#include <QGLWidget>
#include <QGLShaderProgram>

#include <QTime>

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
    GLuint textureId;

    QTime t;
    int _fps;
    int _fpsid;

    float angle1, angle2;
    QPoint last;
    float zoom;
    QVector3D camera;
};

#endif // WIDGET_H
